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
      creations: {
        Row: {
          created_at: string
          example: string
          id: string
          meaning: string
          phrase: string
          safe_flag: boolean
          user_id: string
          vibe: string
        }
        Insert: {
          created_at?: string
          example: string
          id?: string
          meaning: string
          phrase: string
          safe_flag?: boolean
          user_id: string
          vibe: string
        }
        Update: {
          created_at?: string
          example?: string
          id?: string
          meaning?: string
          phrase?: string
          safe_flag?: boolean
          user_id?: string
          vibe?: string
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
      limits: {
        Row: {
          created_at: string
          creations_used: number
          date: string
          generations_used: number
          id: string
          lookups_used: number
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
      profiles: {
        Row: {
          created_at: string
          current_period_end: string | null
          email: string | null
          id: string
          name: string | null
          plan: string | null
          role: string | null
          stripe_customer_id: string | null
          subscription_id: string | null
          subscription_status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          email?: string | null
          id?: string
          name?: string | null
          plan?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          email?: string | null
          id?: string
          name?: string | null
          plan?: string | null
          role?: string | null
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
      [_ in never]: never
    }
    Functions: {
      get_week_start: {
        Args: { input_date?: string }
        Returns: string
      }
      is_profile_owner: {
        Args: { profile_user_id: string }
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
