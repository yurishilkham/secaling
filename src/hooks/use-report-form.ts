import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { type CategoryKey } from '@/constants/categories';
import { friendlyError, type FriendlyError } from '@/lib/errors';
import { uploadPickerAssetToImgBB } from '@/lib/imgbb';
import { supabase } from '@/lib/supabase';

const DRAFT_KEY = '@secaling/draft-laporan';

/** 32 MB — batas unggah imgBB. */
const MAX_PHOTO_BYTES = 32 * 1024 * 1024;

export type ReportDraft = {
  category: CategoryKey | null;
  title: string;
  description: string;
  locationName: string;
  photoUri: string | null;
};

export type FieldErrors = {
  category?: string;
  title?: string;
  description?: string;
};

const EMPTY_DRAFT: ReportDraft = {
  category: null,
  title: '',
  description: '',
  locationName: '',
  photoUri: null,
};

/**
 * Menyimpan seluruh keadaan formulir laporan.
 *
 * Kenapa dipisah dari layarnya: formulirnya sekarang jadi tiga langkah, dan
 * kalau semua ini bercampur dengan tampilan, gampang keliru soal langkah mana
 * yang boleh maju dan kapan draft disimpan.
 *
 * DRAFT DISIMPAN OTOMATIS. Ini penting untuk warga desa: sinyal sering putus,
 * dan orang sering keluar app di tengah mengisi (menerima telepon, membuka
 * WhatsApp untuk mengecek sesuatu). Tanpa draft, semua tulisan hilang dan
 * kebanyakan orang tidak akan mengulanginya.
 */
export function useReportForm() {
  const [draft, setDraft] = useState<ReportDraft>(EMPTY_DRAFT);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [failure, setFailure] = useState<FriendlyError | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Muat draft sekali saat layar dibuka.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (raw && mounted.current) {
          const parsed = JSON.parse(raw) as ReportDraft;
          setDraft({ ...EMPTY_DRAFT, ...parsed });
        }
      } catch {
        // Draft rusak atau tidak bisa dibaca — mulai dari kosong saja.
      }
      if (mounted.current) setDraftLoaded(true);
    })();
  }, []);

  // Simpan setiap perubahan, tapi jangan sebelum draft awal selesai dibaca —
  // kalau tidak, draft yang tersimpan akan langsung tertimpa nilai kosong.
  useEffect(() => {
    if (!draftLoaded) return;
    const isEmpty =
      !draft.category && !draft.title && !draft.description && !draft.locationName;
    if (isEmpty) {
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
      return;
    }
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
  }, [draft, draftLoaded]);

  const update = useCallback(<K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    // Kesalahan hilang begitu warga mulai memperbaikinya, bukan menunggu
    // sampai formulir dikirim ulang.
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as keyof FieldErrors];
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    setPhoto(null);
    setErrors({});
    setFailure(null);
    AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
  }, []);

  // --- Foto ---

  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  const pickPhoto = useCallback(async (source: 'camera' | 'library') => {
    setPermissionMessage(null);
    // Kamera tidak tersedia di web, jadi arahkan ke galeri.
    const effective = Platform.OS === 'web' && source === 'camera' ? 'library' : source;

    try {
      const permission =
        effective === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setPermissionMessage(
          effective === 'camera'
            ? 'Secaling belum diizinkan memakai kamera. Buka Pengaturan HP untuk mengizinkannya, atau pilih foto dari galeri.'
            : 'Secaling belum diizinkan membuka galeri. Buka Pengaturan HP untuk mengizinkannya.',
        );
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
        exif: false,
        allowsEditing: false,
      };

      const result =
        effective === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_PHOTO_BYTES) {
        setPermissionMessage(
          'Foto ini terlalu besar untuk dikirim. Coba foto lain, atau kirim laporan tanpa foto.',
        );
        return;
      }

      if (!mounted.current) return;
      setPhoto(asset);
      setDraft((prev) => ({ ...prev, photoUri: asset.uri }));
    } catch (e) {
      setFailure(friendlyError(e, 'pickPhoto'));
    }
  }, []);

  const clearPhoto = useCallback(() => {
    setPhoto(null);
    setDraft((prev) => ({ ...prev, photoUri: null }));
    setPermissionMessage(null);
  }, []);

  const openSettings = useCallback(() => {
    if (Platform.OS !== 'web') Linking.openSettings().catch(() => {});
  }, []);

  // --- Pemeriksaan isian ---

  /** Langkah 1: jenis kejadian sudah dipilih. */
  const step1Valid = !!draft.category;

  /** Langkah 2: judul dan cerita sudah diisi cukup. */
  const step2Valid = draft.title.trim().length >= 3 && draft.description.trim().length >= 10;

  const validateStep = useCallback(
    (step: 1 | 2 | 3): boolean => {
      const next: FieldErrors = {};

      if (step >= 1 && !draft.category) {
        next.category = 'Pilih dulu jenis kejadiannya.';
      }
      if (step >= 2) {
        const title = draft.title.trim();
        const desc = draft.description.trim();
        if (!title) next.title = 'Tulis judul singkat kejadiannya.';
        else if (title.length < 3) next.title = 'Judulnya terlalu pendek.';

        if (!desc) next.description = 'Ceritakan sedikit apa yang terjadi.';
        else if (desc.length < 10) next.description = 'Ceritanya masih terlalu pendek.';
      }

      setErrors(next);
      return Object.keys(next).length === 0;
    },
    [draft],
  );

  // --- Kirim ---

  const submit = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!validateStep(2)) return false;

      // Diambil ke variabel sendiri supaya TypeScript tahu nilainya pasti
      // terisi. `validateStep(2)` sudah memastikan kategori dipilih, tapi
      // pemeriksa tipe tidak bisa menyimpulkan itu dari pemanggilan fungsi.
      const category = draft.category;
      if (!category) return false;

      setSubmitting(true);
      setFailure(null);

      let photoUrl: string | null = null;
      if (photo) {
        setUploading(true);
        try {
          photoUrl = await uploadPickerAssetToImgBB(photo);
        } catch (e) {
          setUploading(false);
          setSubmitting(false);
          setFailure(friendlyError(e, 'uploadPhoto'));
          return false;
        }
        setUploading(false);
      }

      const { error } = await supabase.from('reports').insert({
        category,
        title: draft.title.trim(),
        description: draft.description.trim(),
        location_name: draft.locationName.trim() || null,
        photo_url: photoUrl,
        reporter_id: userId,
      });

      if (!mounted.current) return false;
      setSubmitting(false);

      if (error) {
        setFailure(friendlyError(error, 'insertReport'));
        return false;
      }

      reset();
      return true;
    },
    [draft, photo, reset, validateStep],
  );

  return {
    draft,
    update,
    reset,
    errors,
    failure,
    clearFailure: () => setFailure(null),

    photo,
    pickPhoto,
    clearPhoto,
    permissionMessage,
    clearPermissionMessage: () => setPermissionMessage(null),
    openSettings,

    step1Valid,
    step2Valid,
    validateStep,

    submit,
    submitting,
    uploading,
    draftLoaded,
    /** Ada isi yang bisa hilang kalau warga keluar. */
    hasContent:
      !!draft.category || !!draft.title || !!draft.description || !!draft.locationName || !!photo,
  };
}
