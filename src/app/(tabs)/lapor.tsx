import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { CATEGORIES, CATEGORY_KEYS, CategoryKey } from '@/constants/categories';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { uploadPickerAssetToImgBB } from '@/lib/imgbb';
import { supabase } from '@/lib/supabase';

export default function LaporScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();

  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function pickImage(source: 'camera' | 'library') {
    try {
      // Web: kamera via getUserMedia butuh HTTPS & sering diblokir, fallback ke galeri
      const isWeb = Platform.OS === 'web';
      const effectiveSource = isWeb && source === 'camera' ? 'library' : source;

      // Cek ketersediaan kamera (native)
      if (source === 'camera' && !isWeb) {
        const camAvailable = await ImagePicker.getCameraPermissionsAsync();
        // Jika device tidak punya kamera (simulator), beri fallback ke galeri
        // launchCameraAsync akan throw, jadi kita tangkap di catch
      }

      const permission =
        effectiveSource === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Izin diperlukan',
          effectiveSource === 'camera'
            ? 'Izinkan akses kamera untuk mengambil foto kejadian.'
            : 'Izinkan akses galeri untuk memilih foto kejadian.',
          [
            { text: 'Batal', style: 'cancel' },
            ...(permission.canAskAgain
              ? [{ text: 'Buka Pengaturan', onPress: () => ImagePicker.requestCameraPermissionsAsync() } as const]
              : []),
          ]
        );
        return;
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
        exif: false,
        allowsEditing: false,
      };

      const result =
        effectiveSource === 'camera'
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Validasi ukuran (imgBB max 32MB, base64 ~1.37x)
        if (asset.fileSize && asset.fileSize > 32 * 1024 * 1024) {
          Alert.alert('Foto terlalu besar', 'Ukuran foto melebihi 32MB. Pilih foto lain dengan kualitas lebih rendah.');
          return;
        }
        setPhoto(asset);
      }
    } catch (e: any) {
      console.warn('[pickImage] error', e);
      // Fallback: jika kamera gagal (simulator/web tanpa kamera), tawarkan galeri
      const msg = e?.message ?? 'Tidak dapat membuka kamera. Coba pilih dari galeri.';
      Alert.alert('Gagal membuka kamera', msg, [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Pilih dari Galeri',
          onPress: async () => {
            try {
              const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.7,
                base64: true,
                exif: false,
              } as ImagePicker.ImagePickerOptions);
              if (!res.canceled && res.assets[0]) setPhoto(res.assets[0]);
            } catch {}
          },
        },
      ]);
    }
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!photo || !session) return null;
    setUploading(true);
    try {
      // Upload ke imgBB (bukan Supabase Storage)
      const url = await uploadPickerAssetToImgBB(photo);
      return url;
    } catch (e: any) {
      Alert.alert('Gagal unggah', e?.message ?? 'Foto tidak dapat diunggah ke imgBB. Cek API key & koneksi.');
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!session) {
      Alert.alert('Perlu masuk', 'Silakan masuk terlebih dahulu untuk melapor.', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Masuk', onPress: () => router.push('/auth/login') },
      ]);
      return;
    }
    if (!category) {
      Alert.alert('Pilih kategori', 'Pilih jenis kejadian terlebih dahulu.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      Alert.alert('Lengkapi data', 'Judul dan deskripsi wajib diisi.');
      return;
    }

    setSubmitting(true);
    const photoUrl = photo ? await uploadPhoto() : null;
    if (photo && !photoUrl) {
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from('reports').insert({
      category,
      title: title.trim(),
      description: description.trim(),
      location_name: locationName.trim() || null,
      photo_url: photoUrl,
      reporter_id: session.user.id,
    });

    if (error) {
      setSubmitting(false);
      Alert.alert('Gagal mengirim', error.message);
      return;
    }

    // Reset form agar tidak duplikat saat kembali
    setCategory(null);
    setTitle('');
    setDescription('');
    setLocationName('');
    setPhoto(null);
    setSubmitting(false);

    // Navigasi ke Beranda (tabs/index). Pakai '/(tabs)' agar kompatibel dengan Expo Router v57 Stack->Tabs
    // Alert di web kadang tidak menjalankan onPress, jadi navigasi dilakukan langsung + via tombol Alert sebagai fallback
    const goHome = () => {
      try {
        router.replace('/(tabs)' as any);
      } catch {
        try {
          router.replace('/' as any);
        } catch {
          router.navigate('/(tabs)' as any);
        }
      }
    };

    // Tampilkan konfirmasi lalu auto-navigate
    if (Platform.OS === 'web') {
      // web: Alert.alert adalah blocking window.alert, navigasi setelahnya lebih reliabel
      Alert.alert('Laporan terkirim', 'Laporan Anda telah dikirim dan akan segera dilihat warga.');
      goHome();
    } else {
      Alert.alert('Laporan terkirim', 'Laporan Anda telah dikirim dan akan segera dilihat warga.', [
        { text: 'Lihat di Beranda', onPress: goHome },
        { text: 'OK', style: 'cancel', onPress: goHome },
      ]);
      // Fallback auto-navigate jika user tidak tap tombol (mis. dismiss alert)
      setTimeout(goHome, 800);
    }
  }

  if (!session) {
    return (
      <Screen scroll={false}>
        <View style={styles.guard}>
          <View style={[styles.guardIcon, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="lock-closed" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.guardTitle, { color: theme.text }]}>Masuk untuk Melapor</Text>
          <Text style={[styles.guardDesc, { color: theme.textSecondary }]}>
            Buat akun atau masuk agar laporan kejadian bisa ditampilkan ke seluruh warga Desa
            Segoropuro.
          </Text>
          <Button title="Masuk / Daftar" onPress={() => router.push('/auth/login')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={[styles.pageTitle, { color: theme.text }]}>Lapor Kejadian</Text>
      <Text style={[styles.pageSub, { color: theme.textSecondary }]}>
        Laporkan kejadian di sekitar Anda agar warga lain ikut waspada.
      </Text>

      <View>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Jenis Kejadian</Text>
        <View style={styles.catGrid}>
          {CATEGORY_KEYS.map((key) => {
            const cat = CATEGORIES[key];
            const selected = category === key;
            return (
              <Pressable
                key={key}
                onPress={() => setCategory(key)}
                style={({ pressed }) => [
                  styles.catCard,
                  {
                    backgroundColor: selected ? cat.soft : theme.card,
                    borderColor: selected ? cat.color : theme.border,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}>
                <View style={[styles.catIcon, { backgroundColor: selected ? cat.color : cat.soft }]}>
                  <Ionicons name={cat.icon} size={22} color={selected ? '#FFFFFF' : cat.color} />
                </View>
                <Text style={[styles.catLabel, { color: theme.text }]}>{cat.label}</Text>
                {selected ? (
                  <View style={[styles.catCheck, { backgroundColor: cat.color }]}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <Input
        label="Judul Kejadian"
        placeholder="Contoh: Pencurian sepeda motor"
        value={title}
        onChangeText={setTitle}
        maxLength={80}
      />
      <Input
        label="Deskripsi Kejadian"
        placeholder="Jelaskan kronologi, ciri pelaku, dsb."
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={500}
      />

      <View>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Foto Kejadian (opsional)</Text>
        {photo ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} resizeMode="cover" />
            <Pressable
              onPress={() => setPhoto(null)}
              style={[styles.photoRemove, { backgroundColor: theme.overlay }]}
              hitSlop={8}>
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <View
            style={[styles.photoEmpty, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.photoEmptyIcon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="camera" size={28} color={theme.primary} />
            </View>
            <Text style={[styles.photoEmptyText, { color: theme.textSecondary }]}>
              Foto bukti kejadian membantu warga memahami situasi.
            </Text>
          </View>
        )}
        <View style={styles.photoActions}>
          <Button
            title={Platform.OS === 'web' ? 'Pilih Foto' : 'Ambil Foto'}
            variant="outline"
            onPress={() => pickImage('camera')}
            icon={<Ionicons name="camera-outline" size={18} color={theme.primary} />}
            style={{ flex: 1 }}
            fullWidth={false}
          />
          <Button
            title="Galeri"
            variant="outline"
            onPress={() => pickImage('library')}
            icon={<Ionicons name="images-outline" size={18} color={theme.primary} />}
            style={{ flex: 1 }}
            fullWidth={false}
          />
        </View>
      </View>

      <Input
        label="Nama Lokasi / Dusun (opsional)"
        placeholder="Contoh: Dusun Krajan RT 02"
        value={locationName}
        onChangeText={setLocationName}
        maxLength={120}
      />

      <Button
        title="Kirim Laporan"
        onPress={submit}
        loading={submitting || uploading}
        icon={<Ionicons name="paper-plane" size={18} color={theme.onPrimary} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: Spacing.two,
  },
  pageSub: {
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.two,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  catCard: {
    width: '48.5%',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
  },
  catIcon: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  catCheck: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 18,
    height: 18,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoWrap: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  photoPreview: {
    width: '100%',
    height: 220,
  },
  photoRemove: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmpty: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  photoEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  guard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  guardIcon: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  guardDesc: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});