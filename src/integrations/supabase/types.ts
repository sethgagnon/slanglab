export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_data: Json | null
          achievement_type: string
          created_at: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_data?: Json | null
          achievement_type: string
          created_at?: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_data?: Json | null
          achievement_type?: string
          created_at?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      anonymous_searches: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          search_count: number
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          search_count?: number
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          search_count?: number
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      banned_terms: {
        Row: {
          created_at: string
          id: string
          phrase: string
        }
        Insert: {
          created_at?: string
          id?: string
          phrase: string
        }
        Update: {
          created_at?: string
          id?: string
          phrase?: string
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_content_id: string
          reported_content_type: string
          reporter_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_content_id: string
          reported_content_type: string
          reporter_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_content_id?: string
          reported_content_type?: string
          reporter_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      creation_monitoring: {
        Row: {
          created_at: string
          creation_id: string
          id: string
          last_checked_at: string | null
          last_found_at: string | null
          monitoring_started_at: string
          platforms_detected: string[] | null
          search_frequency: string
          status: string
          times_found: number
          trending_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creation_id: string
          id?: string
          last_checked_at?: string | null
          last_found_at?: string | null
          monitoring_started_at?: string
          platforms_detected?: string[] | null
          search_frequency?: string
          status?: string
          times_found?: number
          trending_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creation_id?: string
          id?: string
          last_checked_at?: string | null
          last_found_at?: string | null
          monitoring_started_at?: string
          platforms_detected?: string[] | null
          search_frequency?: string
          status?: string
          times_found?: number
          trending_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creation_monitoring_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: true
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
        ]
      }
      creations: {
        Row: {
          created_at: string
          creation_type: string
          example: string
          id: string
          meaning: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_status: string | null
          phrase: string
          safe_flag: boolean
          user_id: string
          vibe: string
        }
        Insert: {
          created_at?: string
          creation_type?: string
          example: string
          id?: string
          meaning: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string | null
          phrase: string
          safe_flag?: boolean
          user_id: string
          vibe: string
        }
        Update: {
          created_at?: string
          creation_type?: string
          example?: string
          id?: string
          meaning?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string | null
          phrase?: string
          safe_flag?: boolean
          user_id?: string
          vibe?: string
        }
        Relationships: []
      }
      creator_stats: {
        Row: {
          best_creation_id: string | null
          created_at: string
          current_streak: number
          days_active: number
          favorite_vibe: string | null
          id: string
          is_public: boolean
          longest_streak: number
          total_creations: number
          total_viral_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_creation_id?: string | null
          created_at?: string
          current_streak?: number
          days_active?: number
          favorite_vibe?: string | null
          id?: string
          is_public?: boolean
          longest_streak?: number
          total_creations?: number
          total_viral_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_creation_id?: string | null
          created_at?: string
          current_streak?: number
          days_active?: number
          favorite_vibe?: string | null
          id?: string
          is_public?: boolean
          longest_streak?: number
          total_creations?: number
          total_viral_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          term_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          term_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          term_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboards: {
        Row: {
          created_at: string
          id: string
          period_end: string | null
          period_start: string | null
          period_type: string
          platform_count: number
          rank_position: number | null
          spotted_count: number
          total_votes: number
          trending_count: number
          updated_at: string
          user_id: string
          viral_score: number
        }
        Insert: {
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          period_type?: string
          platform_count?: number
          rank_position?: number | null
          spotted_count?: number
          total_votes?: number
          trending_count?: number
          updated_at?: string
          user_id: string
          viral_score?: number
        }
        Update: {
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          period_type?: string
          platform_count?: number
          rank_position?: number | null
          spotted_count?: number
          total_votes?: number
          trending_count?: number
          updated_at?: string
          user_id?: string
          viral_score?: number
        }
        Relationships: []
      }
      limits: {
        Row: {
          created_at: string
          creations_used: number
          date: string
          generations_used: number
          id: string
          lookups_used: number
          manual_generations_used: number
          user_id: string
          week_start_date: string | null
        }
        Insert: {
          created_at?: string
          creations_used?: number
          date: string
          generations_used?: number
          id?: string
          lookups_used?: number
          manual_generations_used?: number
          user_id: string
          week_start_date?: string | null
        }
        Update: {
          created_at?: string
          creations_used?: number
          date?: string
          generations_used?: number
          id?: string
          lookups_used?: number
          manual_generations_used?: number
          user_id?: string
          week_start_date?: string | null
        }
        Relationships: []
      }
      lookups: {
        Row: {
          created_at: string
          id: string
          term_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          term_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          term_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lookups_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_access_rate_limit: {
        Row: {
          access_count: number
          created_at: string
          id: string
          user_id: string
          window_start: string
        }
        Insert: {
          access_count?: number
          created_at?: string
          id?: string
          user_id: string
          window_start?: string
        }
        Update: {
          access_count?: number
          created_at?: string
          id?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_verified: boolean | null
          birth_date: string | null
          created_at: string
          current_period_end: string | null
          email: string | null
          id: string
          name: string | null
          parent_email: string | null
          plan: string | null
          role: string | null
          safe_mode: boolean | null
          stripe_customer_id: string | null
          subscription_id: string | null
          subscription_status: string | null
          user_id: string
        }
        Insert: {
          age_verified?: boolean | null
          birth_date?: string | null
          created_at?: string
          current_period_end?: string | null
          email?: string | null
          id?: string
          name?: string | null
          parent_email?: string | null
          plan?: string | null
          role?: string | null
          safe_mode?: boolean | null
          stripe_customer_id?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          user_id: string
        }
        Update: {
          age_verified?: boolean | null
          birth_date?: string | null
          created_at?: string
          current_period_end?: string | null
          email?: string | null
          id?: string
          name?: string | null
          parent_email?: string | null
          plan?: string | null
          role?: string | null
          safe_mode?: boolean | null
          stripe_customer_id?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          reason: string
          status: string
          term_id: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          reason: string
          status?: string
          term_id: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          reason?: string
          status?: string
          term_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      search_sources: {
        Row: {
          base_url: string
          created_at: string
          enabled: boolean
          id: string
          is_required: boolean
          name: string
          notes: string | null
          quality_score: number
          updated_at: string
        }
        Insert: {
          base_url: string
          created_at?: string
          enabled?: boolean
          id?: string
          is_required?: boolean
          name: string
          notes?: string | null
          quality_score?: number
          updated_at?: string
        }
        Update: {
          base_url?: string
          created_at?: string
          enabled?: boolean
          id?: string
          is_required?: boolean
          name?: string
          notes?: string | null
          quality_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          error_message: string | null
          id: string
          ip_address: unknown | null
          record_id: string | null
          success: boolean
          table_name: string
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          success?: boolean
          table_name: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          success?: boolean
          table_name?: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      senses: {
        Row: {
          confidence: string
          created_at: string
          example: string
          id: string
          last_checked_at: string
          meaning: string
          related_json: Json | null
          term_id: string
          tone: string
          warning: string | null
        }
        Insert: {
          confidence: string
          created_at?: string
          example: string
          id?: string
          last_checked_at?: string
          meaning: string
          related_json?: Json | null
          term_id: string
          tone: string
          warning?: string | null
        }
        Update: {
          confidence?: string
          created_at?: string
          example?: string
          id?: string
          last_checked_at?: string
          meaning?: string
          related_json?: Json | null
          term_id?: string
          tone?: string
          warning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "senses_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      slang_shares: {
        Row: {
          created_at: string
          creation_id: string
          id: string
          platform: string
          share_content: Json | null
          share_url: string | null
          shared_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creation_id: string
          id?: string
          platform: string
          share_content?: Json | null
          share_url?: string | null
          shared_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creation_id?: string
          id?: string
          platform?: string
          share_content?: Json | null
          share_url?: string | null
          shared_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slang_shares_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
        ]
      }
      source_rules: {
        Row: {
          created_at: string
          domain: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          status: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          created_at: string
          id: string
          published_at: string | null
          publisher: string | null
          sense_id: string
          snippet: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          published_at?: string | null
          publisher?: string | null
          sense_id: string
          snippet: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          published_at?: string | null
          publisher?: string | null
          sense_id?: string
          snippet?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_sense_id_fkey"
            columns: ["sense_id"]
            isOneToOne: false
            referencedRelation: "senses"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          created_at: string
          id: string
          normalized_text: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          normalized_text: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          normalized_text?: string
          text?: string
        }
        Relationships: []
      }
      user_strikes: {
        Row: {
          admin_id: string
          created_at: string
          description: string
          expires_at: string | null
          id: string
          related_content_id: string | null
          severity: string
          strike_type: string
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          related_content_id?: string | null
          severity?: string
          strike_type: string
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          related_content_id?: string | null
          severity?: string
          strike_type?: string
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          creation_id: string
          id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          creation_id: string
          id?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          creation_id?: string
          id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "votes_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      secure_profiles: {
        Row: {
          age_verified: boolean | null
          birth_date: string | null
          created_at: string | null
          email: string | null
          id: string | null
          name: string | null
          parent_email: string | null
          plan: string | null
          role: string | null
          safe_mode: boolean | null
          subscription_status: string | null
          user_id: string | null
        }
        Insert: {
          age_verified?: boolean | null
          birth_date?: never
          created_at?: string | null
          email?: never
          id?: string | null
          name?: never
          parent_email?: never
          plan?: string | null
          role?: string | null
          safe_mode?: boolean | null
          subscription_status?: string | null
          user_id?: string | null
        }
        Update: {
          age_verified?: boolean | null
          birth_date?: never
          created_at?: string | null
          email?: never
          id?: string | null
          name?: never
          parent_email?: never
          plan?: string | null
          role?: string | null
          safe_mode?: boolean | null
          subscription_status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_week_start: {
        Args: { input_date?: string }
        Returns: string
      }
      has_labpro_access: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_profile_owner: {
        Args: { profile_user_id: string }
        Returns: boolean
      }
      mask_sensitive_data: {
        Args: { input_text: string }
        Returns: string
      }
      user_can_create_content: {
        Args: { user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
