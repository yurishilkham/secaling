/**
 * Tipe basis data — DIHASILKAN OTOMATIS oleh generator tipe Supabase.
 * Jangan disunting tangan; hasilkan ulang setiap kali skema berubah.
 *
 * Kunci `Relationships` wajib ada meski tampak tidak terpakai: `supabase-js`
 * membacanya untuk menyimpulkan tipe hasil kueri bersarang seperti
 * `select('*, profiles(full_name)')`. Kalau dihapus, seluruh operasi insert
 * dan update kehilangan tipenya.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.17';
  };
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          is_important: boolean;
          title: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          is_important?: boolean;
          title: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          is_important?: boolean;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'announcements_author_id_profiles_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          dusun: string;
          full_name: string;
          id: string;
          jabatan: string | null;
          phone: string;
          role: string;
        };
        Insert: {
          created_at?: string;
          dusun?: string;
          full_name?: string;
          id: string;
          jabatan?: string | null;
          phone?: string;
          role?: string;
        };
        Update: {
          created_at?: string;
          dusun?: string;
          full_name?: string;
          id?: string;
          jabatan?: string | null;
          phone?: string;
          role?: string;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: { created_at: string; id: string; token: string; user_id: string | null };
        Insert: { created_at?: string; id?: string; token: string; user_id?: string | null };
        Update: { created_at?: string; id?: string; token?: string; user_id?: string | null };
        Relationships: [];
      };
      report_confirmations: {
        Row: { created_at: string; report_id: string; user_id: string };
        Insert: { created_at?: string; report_id: string; user_id: string };
        Update: { created_at?: string; report_id?: string; user_id?: string };
        Relationships: [
          {
            foreignKeyName: 'report_confirmations_report_id_fkey';
            columns: ['report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'report_confirmations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reports: {
        Row: {
          category: string;
          created_at: string;
          description: string;
          id: string;
          latitude: number | null;
          location_name: string | null;
          longitude: number | null;
          photo_url: string | null;
          reporter_id: string;
          status: Database['public']['Enums']['report_status'];
          status_changed_at: string | null;
          status_changed_by: string | null;
          title: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          description: string;
          id?: string;
          latitude?: number | null;
          location_name?: string | null;
          longitude?: number | null;
          photo_url?: string | null;
          reporter_id: string;
          status?: Database['public']['Enums']['report_status'];
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          title: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          latitude?: number | null;
          location_name?: string | null;
          longitude?: number | null;
          photo_url?: string | null;
          reporter_id?: string;
          status?: Database['public']['Enums']['report_status'];
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_reporter_id_profiles_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      hitung_pembenaran: {
        Args: { daftar_id: string[] };
        Returns: { jumlah: number; report_id: string }[];
      };
      is_admin: { Args: never; Returns: boolean };
      register_push_token: { Args: { p_token: string }; Returns: undefined };
    };
    Enums: {
      report_status: 'baru' | 'ditangani' | 'selesai';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

/** Jalan pintas yang dipakai di seluruh app. */
export type ReportStatus = Database['public']['Enums']['report_status'];
export type ReportRow = Database['public']['Tables']['reports']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type AnnouncementRow = Database['public']['Tables']['announcements']['Row'];
