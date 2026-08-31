import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { InlineBanner } from '@/components/ui/inline-banner';
import { Input } from '@/components/ui/input';
import { Surface } from '@/components/ui/surface';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { FormStatus, PasswordFieldErrors } from '@/hooks/use-auth-forms';

type Section = 'email' | 'password' | null;

type Props = {
  email: string;
  emailConfirmed: boolean;

  newEmail: string;
  setNewEmail: (v: string) => void;
  onChangeEmail: () => void;
  emailLoading: boolean;
  emailCooldown: number;
  emailStatus: FormStatus;
  emailFieldError: string | null;

  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  onChangePassword: () => void;
  passLoading: boolean;
  passStatus: FormStatus;
  passFieldErrors: PasswordFieldErrors;

  onDismissStatus: () => void;
};

/**
 * Keamanan akun — ubah email dan kata sandi.
 *
 * Perubahan:
 *   - Semua `Alert.alert` hilang. Berhasil dan gagal tampil sebagai banner di
 *     dalam panel yang bersangkutan, kesalahan isian menempel di bawah
 *     kolomnya. Warga tidak perlu menekan OK untuk melanjutkan.
 *   - Kolom kata sandi punya tombol lihat/sembunyikan (dari `Input` baru).
 *   - Baris panel 54px -> 64px.
 *   - "tap untuk buka" -> "ketuk untuk membuka". Petunjuk "Untuk akun Google,
 *     mengatur kata sandi memungkinkan login via email+password juga" ditulis
 *     ulang tanpa istilah teknis.
 *   - Tanda "belum diperiksa" pada email tidak lagi ikut terpotong: dulu ia
 *     berada di dalam satu baris `numberOfLines={1}` bersama alamat email, jadi
 *     di layar sempit peringatannya justru yang hilang pertama.
 */
export function SecurityAccordion({
  email,
  emailConfirmed,
  newEmail,
  setNewEmail,
  onChangeEmail,
  emailLoading,
  emailCooldown,
  emailStatus,
  emailFieldError,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  onChangePassword,
  passLoading,
  passStatus,
  passFieldErrors,
  onDismissStatus,
}: Props) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState<Section>(null);

  function toggle(section: Exclude<Section, null>) {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch {}
    }
    onDismissStatus();
    setOpen((prev) => (prev === section ? null : section));
  }

  function renderRow(
    section: Exclude<Section, null>,
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    subtitle: string,
    hint: string,
  ) {
    const isOpen = open === section;

    return (
      <Pressable
        onPress={() => toggle(section)}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={title}
        accessibilityHint={hint}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: isOpen ? colors.primarySoft : colors.background,
            borderColor: isOpen ? colors.primaryText : colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <View
          style={[
            styles.rowIcon,
            {
              backgroundColor: isOpen ? colors.primary : colors.card,
              borderColor: isOpen ? colors.primary : colors.border,
            },
          ]}>
          <Ionicons
            name={icon}
            size={22}
            color={isOpen ? colors.onPrimary : colors.primaryText}
          />
        </View>

        <View style={styles.rowText}>
          <AppText variant="bodyStrong" color="text">
            {title}
          </AppText>
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {subtitle}
          </AppText>
        </View>

        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={colors.textSecondary}
        />
      </Pressable>
    );
  }

  return (
    <Surface tone="card" radius={Radius.lg} style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.primaryText} />
        </View>
        <View style={styles.headerText}>
          <AppText variant="heading" color="text" heading>
            Keamanan Akun
          </AppText>
          <AppText variant="caption" color="textMuted">
            Ketuk untuk membuka
          </AppText>
        </View>
      </View>

      {/* Tanda email belum diperiksa dibuat mencolok, di baris sendiri.
          Ini informasi penting: tanpa email yang sudah diperiksa, warga tidak
          bisa memulihkan akunnya kalau lupa kata sandi. */}
      {!emailConfirmed ? (
        <Surface tone="warning" radius={Radius.md} style={styles.warnBox}>
          <Ionicons name="alert-circle" size={22} color={colors.warning} />
          <AppText variant="caption" color="textSecondary" style={styles.warnText}>
            Email Anda belum dipastikan. Buka kotak masuk email dan ketuk tautan
            dari kami.
          </AppText>
        </Surface>
      ) : null}

      {/* --- Email --- */}
      {renderRow(
        'email',
        'mail-outline',
        'Ubah Email',
        email,
        'Membuka isian untuk mengganti alamat email Anda',
      )}

      {open === 'email' ? (
        <Animated.View entering={FadeIn.duration(180)} style={styles.body}>
          {emailStatus.kind !== 'idle' ? (
            <InlineBanner
              tone={emailStatus.kind === 'success' ? 'success' : 'error'}
              message={emailStatus.message}
              onDismiss={onDismissStatus}
            />
          ) : null}

          <View style={[styles.currentBox, { backgroundColor: colors.background }]}>
            <AppText variant="caption" color="textMuted">
              Email Anda sekarang
            </AppText>
            <AppText variant="body" color="text">
              {email}
            </AppText>
          </View>

          <Input
            label="Email baru"
            required
            hint="Kami akan mengirim tautan ke email baru ini"
            placeholder="nama@gmail.com"
            value={newEmail}
            onChangeText={setNewEmail}
            error={emailFieldError}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />

          <Button
            title={emailCooldown > 0 ? `Tunggu ${emailCooldown} detik` : 'Ganti Email'}
            onPress={onChangeEmail}
            loading={emailLoading}
            disabled={emailLoading || emailCooldown > 0}
            icon={<Ionicons name="mail" size={22} color={colors.onPrimary} />}
          />

          <AppText variant="caption" color="textMuted">
            Setelah menekan tombol di atas, buka kotak masuk email baru Anda dan
            ketuk tautan dari kami. Cukup 1 klik di email baru — langsung berganti.
          </AppText>
        </Animated.View>
      ) : null}

      {/* --- Kata sandi --- */}
      {renderRow(
        'password',
        'key-outline',
        'Ubah Kata Sandi',
        'Paling sedikit 6 huruf atau angka',
        'Membuka isian untuk mengganti kata sandi Anda',
      )}

      {open === 'password' ? (
        <Animated.View entering={FadeIn.duration(180)} style={styles.body}>
          {passStatus.kind !== 'idle' ? (
            <InlineBanner
              tone={passStatus.kind === 'success' ? 'success' : 'error'}
              message={passStatus.message}
              onDismiss={onDismissStatus}
            />
          ) : null}

          <Input
            label="Kata sandi baru"
            required
            hint="Paling sedikit 6 huruf atau angka"
            placeholder="Tulis kata sandi baru"
            value={newPassword}
            onChangeText={setNewPassword}
            error={passFieldErrors.password}
            secureTextEntry
            autoComplete="new-password"
          />

          <Input
            label="Tulis ulang kata sandi baru"
            required
            placeholder="Tulis sekali lagi"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={passFieldErrors.confirm}
            secureTextEntry
            autoComplete="new-password"
          />

          <Button
            title="Ganti Kata Sandi"
            onPress={onChangePassword}
            loading={passLoading}
            icon={<Ionicons name="lock-closed" size={22} color={colors.onPrimary} />}
          />

          <AppText variant="caption" color="textMuted">
            Kalau Anda masuk memakai akun Google, mengisi kata sandi di sini
            membuat Anda juga bisa masuk memakai email dan kata sandi.
          </AppText>
        </Animated.View>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  warnText: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: Touch.large,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 2,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  body: {
    gap: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  currentBox: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: 2,
  },
});
