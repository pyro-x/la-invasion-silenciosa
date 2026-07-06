export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      point_events: {
        Row: {
          created_at: string
          id: string
          points: number
          sighting_id: string | null
          type: string
          user_id: string
          verification_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          points: number
          sighting_id?: string | null
          type: string
          user_id: string
          verification_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          sighting_id?: string | null
          type?: string
          user_id?: string
          verification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'point_events_sighting_id_fkey'
            columns: ['sighting_id']
            isOneToOne: false
            referencedRelation: 'sightings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'point_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'point_events_verification_id_fkey'
            columns: ['verification_id']
            isOneToOne: false
            referencedRelation: 'verifications'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: string
          total_points: number
          weekly_points: number
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          role?: string
          total_points?: number
          weekly_points?: number
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          total_points?: number
          weekly_points?: number
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          note: string | null
          reason: string
          sighting_id: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          reason: string
          sighting_id: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          reason?: string
          sighting_id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'reports_sighting_id_fkey'
            columns: ['sighting_id']
            isOneToOne: false
            referencedRelation: 'sightings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      sightings: {
        Row: {
          auto_moderation_flags: string[] | null
          auto_moderation_provider: string | null
          auto_moderation_result: Json | null
          auto_moderation_score: number | null
          confidence: string
          created_at: string
          created_by: string | null
          id: string
          image_processing_status: string
          lat_private: number | null
          lat_public: number
          lng_private: number | null
          lng_public: number
          location_accuracy_m: number | null
          moderation_status: string
          photo_blurred_path: string | null
          photo_path: string | null
          photo_thumbnail_path: string | null
          points_awarded: boolean
          points_awarded_at: string | null
          rejection_reason: string | null
          report_count: number
          reviewed_at: string | null
          reviewed_by: string | null
          species_id: string
          updated_at: string
          verification_count: number
        }
        Insert: {
          auto_moderation_flags?: string[] | null
          auto_moderation_provider?: string | null
          auto_moderation_result?: Json | null
          auto_moderation_score?: number | null
          confidence?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_processing_status?: string
          lat_private?: number | null
          lat_public: number
          lng_private?: number | null
          lng_public: number
          location_accuracy_m?: number | null
          moderation_status?: string
          photo_blurred_path?: string | null
          photo_path?: string | null
          photo_thumbnail_path?: string | null
          points_awarded?: boolean
          points_awarded_at?: string | null
          rejection_reason?: string | null
          report_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          species_id: string
          updated_at?: string
          verification_count?: number
        }
        Update: {
          auto_moderation_flags?: string[] | null
          auto_moderation_provider?: string | null
          auto_moderation_result?: Json | null
          auto_moderation_score?: number | null
          confidence?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_processing_status?: string
          lat_private?: number | null
          lat_public?: number
          lng_private?: number | null
          lng_public?: number
          location_accuracy_m?: number | null
          moderation_status?: string
          photo_blurred_path?: string | null
          photo_path?: string | null
          photo_thumbnail_path?: string | null
          points_awarded?: boolean
          points_awarded_at?: string | null
          rejection_reason?: string | null
          report_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          species_id?: string
          updated_at?: string
          verification_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sightings_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sightings_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sightings_species_id_fkey'
            columns: ['species_id']
            isOneToOne: false
            referencedRelation: 'species'
            referencedColumns: ['id']
          },
        ]
      }
      species: {
        Row: {
          created_at: string
          description: string
          dex_number: string
          habitat: string
          id: string
          is_active: boolean
          name: string
          points: number
          rarity: string
          slug: string
          tracking_tip: string
        }
        Insert: {
          created_at?: string
          description: string
          dex_number: string
          habitat: string
          id?: string
          is_active?: boolean
          name: string
          points?: number
          rarity: string
          slug: string
          tracking_tip: string
        }
        Update: {
          created_at?: string
          description?: string
          dex_number?: string
          habitat?: string
          id?: string
          is_active?: boolean
          name?: string
          points?: number
          rarity?: string
          slug?: string
          tracking_tip?: string
        }
        Relationships: []
      }
      verifications: {
        Row: {
          created_at: string
          id: string
          note: string | null
          points_awarded: boolean
          sighting_id: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          points_awarded?: boolean
          sighting_id: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          points_awarded?: boolean
          sighting_id?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'verifications_sighting_id_fkey'
            columns: ['sighting_id']
            isOneToOne: false
            referencedRelation: 'sightings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'verifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
