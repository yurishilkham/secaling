import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function AdminAnnouncementScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session, profile, loading } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [important, setImportant] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!session || !profile || profile.role !== 'admin') return;
    if (!title.trim() || !body.trim()) {
      Alert.alert('Lengkapi data', 'Judul dan isi pengumuman wajib diisi.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('announcements').insert({
      title: title.trim(),
      body: body.trim(),
      is_important: important,
      author_id: session.user.id,
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Gagal mengirim', error.message);
      return;
    }
    Alert.alert('Terbit', 'Pengumuman berhasil diterbitkan.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  if (loading) {
    return (
      <Screen scroll={false}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>Memuat…</Text>
      </Screen>
    );
  }

  if (!session || !profile || profile.role !== 'admin') {
    return (
      <Screen scroll={false}>
        <View style={styles.guard}>
          <Text style={[styles.guardTitle, { color: theme.danger }]}>Akses Ditolak</Text>
          <Text style={[styles.guardDesc, { color: theme.textSecondary }]}>
            Halaman ini khusus perangkat desa. Hubungi admin desa bila Anda merasa seharusnya
            memiliki akses.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Pengumuman akan tampil di Beranda dan mengirim notifikasi ke semua warga.
      </Text>

      <Input label="Judul Pengumuman" placeholder="Contoh: Kerja bakti Minggu pagi" value={title} onChangeText={setTitle} maxLength={120} />
      <Input label="Isi Pengumuman" placeholder="Tulis isi pengumuman di sini…" value={body} onChangeText={setBody} multiline maxLength={1000} />

      <Pressable
        onPress={() => setImportant((v) => !v)}
        style={({ pressed }) => [
          styles.toggle,
          {
            backgroundColor: important ? theme.dangerSoft : theme.card,
            borderColor: important ? theme.danger : theme.border,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}>
        <View style={styles.toggleHeader}>
          <Ionicons name="warning" size={18} color={important ? theme.danger : theme.textMuted} />
          <Text style={[styles.toggleTitle, { color: theme.text }]}>Tandai Penting</Text>
          <View
            style={[
              styles.toggleCheck,
              { backgroundColor: important ? theme.danger : theme.border },
            ]}>
            {important ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
          </View>
        </View>
        <Text style={[styles.toggleDesc, { color: theme.textSecondary }]}>
          Pengumuman penting akan ditampilkan lebih menonjol.
        </Text>
      </Pressable>

      <Button title="Terbitkan Pengumuman" onPress={submit} loading={submitting} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: Spacing.two,
  },
  toggle: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  toggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  toggleCheck: {
    marginLeft: 'auto',
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  toggleDesc: {
    fontSize: 12,
  },
  guard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
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
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingTop: Spacing.six,
  },
});