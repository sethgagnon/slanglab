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
      ai_call_logs: {
        Row: {
          attempts: number | null
          client_ip: string | null
          created_at: string
          id: string
          model: string
          status: number
          tokens_in: number | null
          tokens_out: number | null
          user_id: string | null
          was_cached: boolean | null
          was_coalesced: boolean | null
        }
        Insert: {
          attempts?: number | null
          client_ip?: string | null
          created_at?: string
          id?: string
          model: string
          status: number
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
          was_cached?: boolean | null
          was_coalesced?: boolean | null
        }
        Update: {
          attempts?: number | null
          client_ip?: string | null
          created_at?: string
          id?: string
          model?: string
          status?: number
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
          was_cached?: boolean | null
          was_coalesced?: boolean | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string
          id: string
          last_notified_at: string | null
          rule: Json
          term_id: string
          threshold: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_notified_at?: string | null
          rule?: Json
          term_id: string
          threshold?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_notified_at?: string | null
          rule?: Json
          term_id?: string
          threshold?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      anonymous_searches: {
        Row: {
          anonymized_ip: string | null
          created_at: string
          id: string
          ip_address: string | null
          search_count: number
          session_id: string
          updated_at: string
        }
        Insert: {
          anonymized_ip?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          search_count?: number
          session_id: string
          updated_at?: string
        }
        Update: {
          anonymized_ip?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          search_count?: number
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          actual_cost: number | null
          api_endpoint: string
          api_provider: string
          completion_tokens: number | null
          created_at: string
          error_message: string | null
          estimated_cost: number
          function_name: string
          id: string
          processing_time_ms: number | null
          prompt_tokens: number | null
          request_data: Json | null
          request_type: string
          response_data: Json | null
          session_id: string | null
          status: number
          total_tokens: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actual_cost?: number | null
          api_endpoint: string
          api_provider: string
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          estimated_cost?: number
          function_name: string
          id?: string
          processing_time_ms?: number | null
          prompt_tokens?: number | null
          request_data?: Json | null
          request_type: string
          response_data?: Json | null
          session_id?: string | null
          status: number
          total_tokens?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actual_cost?: number | null
          api_endpoint?: string
          api_provider?: string
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          estimated_cost?: number
          function_name?: string
          id?: string
          processing_time_ms?: number | null
          prompt_tokens?: number | null
          request_data?: Json | null
          request_type?: string
          response_data?: Json | null
          session_id?: string | null
          status?: number
          total_tokens?: number | null
          updated_at?: string
          user_id?: string | null
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
      billing_data: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          created_at: string
          id: string
          provider: string
          raw_billing_data: Json | null
          synced_at: string
          total_cost: number
          usage_details: Json | null
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          id?: string
          provider: string
          raw_billing_data?: Json | null
          synced_at?: string
          total_cost: number
          usage_details?: Json | null
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          id?: string
          provider?: string
          raw_billing_data?: Json | null
          synced_at?: string
          total_cost?: number
          usage_details?: Json | null
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
      cost_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_message: string
          alert_type: string
          created_at: string
          current_amount: number
          id: string
          severity: string
          threshold_amount: number
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_message: string
          alert_type: string
          created_at?: string
          current_amount: number
          id?: string
          severity?: string
          threshold_amount: number
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_message?: string
          alert_type?: string
          created_at?: string
          current_amount?: number
          id?: string
          severity?: string
          threshold_amount?: number
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
      digest_state: {
        Row: {
          created_at: string
          id: string
          last_weekly_digest_sent: string | null
          updated_at: string
          user_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_weekly_digest_sent?: string | null
          updated_at?: string
          user_id: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          id?: string
          last_weekly_digest_sent?: string | null
          updated_at?: string
          user_id?: string
          week_start_date?: string
        }
        Relationships: []
      }
      edge_function_rate_limits: {
        Row: {
          created_at: string
          function_name: string
          id: string
          identifier: string
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          identifier: string
          request_count?: number
          updated_at?: string
          window_start: string
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          identifier?: string
          request_count?: number
          updated_at?: string
          window_start?: string
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
      first_sighting_notifications: {
        Row: {
          id: string
          sent_at: string
          sighting_id: string
          term_id: string
          user_id: string
        }
        Insert: {
          id?: string
          sent_at?: string
          sighting_id: string
          term_id: string
          user_id: string
        }
        Update: {
          id?: string
          sent_at?: string
          sighting_id?: string
          term_id?: string
          user_id?: string
        }
        Relationships: []
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
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          first_sighting_enabled: boolean
          id: string
          unsubscribe_token: string | null
          updated_at: string
          user_id: string
          weekly_digest_enabled: boolean
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          first_sighting_enabled?: boolean
          id?: string
          unsubscribe_token?: string | null
          updated_at?: string
          user_id: string
          weekly_digest_enabled?: boolean
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          first_sighting_enabled?: boolean
          id?: string
          unsubscribe_token?: string | null
          updated_at?: string
          user_id?: string
          weekly_digest_enabled?: boolean
        }
        Relationships: []
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
          created_at: string
          email: string | null
          id: string
          name: string | null
          plan: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          plan?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          plan?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recent_generations: {
        Row: {
          created_at: string
          expires_at: string
          key: string
          model: string
          text: string
          usage: Json | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          key: string
          model: string
          text: string
          usage?: Json | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          key?: string
          model?: string
          text?: string
          usage?: Json | null
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
      secure_payment_info: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          stripe_customer_id: string | null
          subscription_id: string | null
          subscription_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          stripe_customer_id?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          stripe_customer_id?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      secure_personal_info: {
        Row: {
          age_band: string | null
          age_verified: boolean | null
          birth_date: string | null
          created_at: string
          id: string
          parent_email: string | null
          safe_mode: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_band?: string | null
          age_verified?: boolean | null
          birth_date?: string | null
          created_at?: string
          id?: string
          parent_email?: string | null
          safe_mode?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_band?: string | null
          age_verified?: boolean | null
          birth_date?: string | null
          created_at?: string
          id?: string
          parent_email?: string | null
          safe_mode?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          anonymized_ip: string | null
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
          anonymized_ip?: string | null
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
          anonymized_ip?: string | null
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
      sightings: {
        Row: {
          created_at: string
          first_seen_at: string
          id: string
          lang: string
          last_seen_at: string
          match_type: string
          score: number
          snippet: string
          source: string
          term_id: string
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string
          first_seen_at?: string
          id?: string
          lang?: string
          last_seen_at?: string
          match_type?: string
          score?: number
          snippet: string
          source: string
          term_id: string
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string
          first_seen_at?: string
          id?: string
          lang?: string
          last_seen_at?: string
          match_type?: string
          score?: number
          snippet?: string
          source?: string
          term_id?: string
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sightings_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      slang_cache: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          phrases: Json
          quality_score: number | null
          usage_count: number | null
          vibe: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          phrases: Json
          quality_score?: number | null
          usage_count?: number | null
          vibe: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          phrases?: Json
          quality_score?: number | null
          usage_count?: number | null
          vibe?: string
        }
        Relationships: []
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
          config: Json | null
          created_at: string
          domain: string
          domains_allowlist: Json | null
          domains_blocklist: Json | null
          enabled: boolean | null
          id: string
          languages: Json | null
          last_run_at: string | null
          min_score: number | null
          per_run_cap: number | null
          source_name: string | null
          source_type: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          domain: string
          domains_allowlist?: Json | null
          domains_blocklist?: Json | null
          enabled?: boolean | null
          id?: string
          languages?: Json | null
          last_run_at?: string | null
          min_score?: number | null
          per_run_cap?: number | null
          source_name?: string | null
          source_type?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          domain?: string
          domains_allowlist?: Json | null
          domains_blocklist?: Json | null
          enabled?: boolean | null
          id?: string
          languages?: Json | null
          last_run_at?: string | null
          min_score?: number | null
          per_run_cap?: number | null
          source_name?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string | null
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
      term_variants: {
        Row: {
          created_at: string
          id: string
          term_id: string
          variant_text: string
          variant_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          term_id: string
          variant_text: string
          variant_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          term_id?: string
          variant_text?: string
          variant_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "term_variants_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          created_at: string
          id: string
          normalized_text: string
          original_text: string
          slug: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          normalized_text: string
          original_text: string
          slug: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          normalized_text?: string
          original_text?: string
          slug?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      trackers: {
        Row: {
          created_at: string
          last_run_at: string | null
          schedule_cron: string
          sensitivity: string
          sources_enabled: Json
          term_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          last_run_at?: string | null
          schedule_cron?: string
          sensitivity?: string
          sources_enabled?: Json
          term_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          last_run_at?: string | null
          schedule_cron?: string
          sensitivity?: string
          sources_enabled?: Json
          term_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trackers_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: true
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_generation_preferences: {
        Row: {
          cache_preference: string | null
          created_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cache_preference?: string | null
          created_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cache_preference?: string | null
          created_at?: string | null
          updated_at?: string | null
          user_id?: string
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
      [_ in never]: never
    }
    Functions: {
      anonymize_ip: {
        Args: { ip_address: string }
        Returns: string
      }
      check_edge_function_rate_limit: {
        Args: {
          p_function_name?: string
          p_identifier: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      check_profile_access_rate_limit: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      cleanup_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      compute_age_band: {
        Args: { birth_date_input: string }
        Returns: string
      }
      get_admin_safe_profile_data: {
        Args: { profile_user_id: string }
        Returns: {
          created_at: string
          email_masked: string
          id: string
          name: string
          plan: string
          role: string
          user_id: string
        }[]
      }
      get_age_policy: {
        Args: { target_user_id: string }
        Returns: Json
      }
      get_anonymous_term_info: {
        Args: { term_slug: string }
        Returns: {
          meaning_summary: string
          term_text: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_public_creator_overview: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_creators: number
          total_public_creations: number
        }[]
      }
      get_public_term_info: {
        Args: { term_slug: string }
        Returns: {
          created_at: string
          id: string
          normalized_text: string
          original_text: string
          slug: string
          text: string
        }[]
      }
      get_secure_profile_data: {
        Args: { profile_user_id: string }
        Returns: {
          created_at: string
          email: string
          id: string
          name: string
          plan: string
          role: string
          user_id: string
        }[]
      }
      get_secure_user_profile: {
        Args: { target_user_id: string }
        Returns: {
          age_verified: boolean
          birth_date: string
          created_at: string
          current_period_end: string
          email: string
          id: string
          name: string
          parent_email: string
          plan: string
          role: string
          safe_mode: boolean
          stripe_customer_id: string
          subscription_id: string
          subscription_status: string
          user_id: string
        }[]
      }
      get_user_payment_info: {
        Args: { target_user_id: string }
        Returns: {
          current_period_end: string
          stripe_customer_id: string
          subscription_id: string
          subscription_status: string
        }[]
      }
      get_user_personal_info: {
        Args: { target_user_id: string }
        Returns: {
          age_verified: boolean
          birth_date: string
          parent_email: string
          safe_mode: boolean
        }[]
      }
      get_week_start: {
        Args: { input_date?: string }
        Returns: string
      }
      has_labpro_access: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin: {
        Args: { checking_user_id?: string }
        Returns: boolean
      }
      is_authenticated_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_profile_owner: {
        Args: { profile_user_id: string }
        Returns: boolean
      }
      log_sensitive_data_access: {
        Args: { action_type: string; record_id?: string; table_name: string }
        Returns: undefined
      }
      mask_sensitive_data: {
        Args: { input_text: string }
        Returns: string
      }
      update_anonymized_ips: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      user_can_access_profile: {
        Args: { target_user_id: string }
        Returns: boolean
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
