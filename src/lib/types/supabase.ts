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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          active: boolean
          created_at: string
          ends_at: string | null
          id: string
          message: string
          starts_at: string
          title: string
          type: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          message: string
          starts_at?: string
          title: string
          type?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          message?: string
          starts_at?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      bdd: {
        Row: {
          created_at: string | null
          csv_hash: string | null
          csv_url: string | null
          id: string
          name: string
          organization_id: string | null
          proprietaire: string | null
          query: string | null
          source: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          csv_hash?: string | null
          csv_url?: string | null
          id?: string
          name: string
          organization_id?: string | null
          proprietaire?: string | null
          query?: string | null
          source?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          csv_hash?: string | null
          csv_url?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          proprietaire?: string | null
          query?: string | null
          source?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bdd_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bdd_proprietaire_fkey"
            columns: ["proprietaire"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      call_session_notes: {
        Row: {
          author_id: string
          call_session_id: string
          content: string
          created_at: string
          id: string
          prospect_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          call_session_id: string
          content?: string
          created_at?: string
          id?: string
          prospect_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          call_session_id?: string
          content?: string
          created_at?: string
          id?: string
          prospect_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_session_notes_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_session_notes_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      call_session_prospects: {
        Row: {
          call_duration_s: number | null
          call_session_id: string
          called_at: string | null
          id: string
          outcome: string | null
          prospect_id: string
          status: string | null
        }
        Insert: {
          call_duration_s?: number | null
          call_session_id: string
          called_at?: string | null
          id?: string
          outcome?: string | null
          prospect_id: string
          status?: string | null
        }
        Update: {
          call_duration_s?: number | null
          call_session_id?: string
          called_at?: string | null
          id?: string
          outcome?: string | null
          prospect_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_session_prospects_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_session_prospects_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          active_heartbeat_at: string | null
          active_user_id: string | null
          created_at: string
          created_by: string
          description: string | null
          ended_at: string | null
          id: string
          metadata: Json | null
          organization_id: string
          scheduled_at: string | null
          script_template: string | null
          status: string | null
          title: string | null
          total_duration_s: number | null
        }
        Insert: {
          active_heartbeat_at?: string | null
          active_user_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          scheduled_at?: string | null
          script_template?: string | null
          status?: string | null
          title?: string | null
          total_duration_s?: number | null
        }
        Update: {
          active_heartbeat_at?: string | null
          active_user_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          scheduled_at?: string | null
          script_template?: string | null
          status?: string | null
          title?: string | null
          total_duration_s?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_job_prospects: {
        Row: {
          error: string | null
          id: string
          job_id: string
          processed_at: string | null
          prospect_id: string
          status: string
        }
        Insert: {
          error?: string | null
          id?: string
          job_id: string
          processed_at?: string | null
          prospect_id: string
          status?: string
        }
        Update: {
          error?: string | null
          id?: string
          job_id?: string
          processed_at?: string | null
          prospect_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_job_prospects_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "campaign_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_job_prospects_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "prospect_in_active_campaign"
            referencedColumns: ["campaign_job_id"]
          },
          {
            foreignKeyName: "campaign_job_prospects_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_jobs: {
        Row: {
          batch_lock_at: string | null
          batch_size: number
          completed_at: string | null
          created_at: string
          created_by: string
          delay_ms: number
          deleted_at: string | null
          error_count: number
          id: string
          last_batch_at: string | null
          message_template: string | null
          metadata: Json | null
          organization_id: string
          processed_count: number
          started_at: string | null
          status: string
          success_count: number
          total_count: number
          type: string
        }
        Insert: {
          batch_lock_at?: string | null
          batch_size?: number
          completed_at?: string | null
          created_at?: string
          created_by: string
          delay_ms?: number
          deleted_at?: string | null
          error_count?: number
          id?: string
          last_batch_at?: string | null
          message_template?: string | null
          metadata?: Json | null
          organization_id: string
          processed_count?: number
          started_at?: string | null
          status?: string
          success_count?: number
          total_count?: number
          type: string
        }
        Update: {
          batch_lock_at?: string | null
          batch_size?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string
          delay_ms?: number
          deleted_at?: string | null
          error_count?: number
          id?: string
          last_batch_at?: string | null
          message_template?: string | null
          metadata?: Json | null
          organization_id?: string
          processed_count?: number
          started_at?: string | null
          status?: string
          success_count?: number
          total_count?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichment_credits: {
        Row: {
          created_at: string | null
          credits_available: number | null
          credits_used: number | null
          last_reset_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits_available?: number | null
          credits_used?: number | null
          last_reset_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits_available?: number | null
          credits_used?: number | null
          last_reset_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichment_jobs: {
        Row: {
          attempts: number
          bdd_id: string | null
          created_at: string
          id: string
          last_error: string | null
          max_attempts: number
          organization_id: string
          prospect_id: string
          requested_by_user_id: string
          run_after: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          bdd_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          organization_id: string
          prospect_id: string
          requested_by_user_id: string
          run_after?: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          bdd_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          organization_id?: string
          prospect_id?: string
          requested_by_user_id?: string
          run_after?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_jobs_bdd_id_fkey"
            columns: ["bdd_id"]
            isOneToOne: false
            referencedRelation: "bdd"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrichment_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrichment_jobs_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          attendee_user_ids: string[]
          confirmation_email_sent_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string
          event_type: string | null
          google_event_id: string | null
          google_meet_url: string | null
          guest_email: string | null
          guest_linkedin: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          internal_notes: string | null
          is_all_day: boolean
          location: string | null
          meeting_kind: string
          organization_id: string
          pipeline_stage: string | null
          prospect_id: string | null
          source: string
          start_time: string
          status: string
          title: string
          updated_at: string | null
          wa_workflow: boolean
        }
        Insert: {
          attendee_user_ids?: string[]
          confirmation_email_sent_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time: string
          event_type?: string | null
          google_event_id?: string | null
          google_meet_url?: string | null
          guest_email?: string | null
          guest_linkedin?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          internal_notes?: string | null
          is_all_day?: boolean
          location?: string | null
          meeting_kind?: string
          organization_id: string
          pipeline_stage?: string | null
          prospect_id?: string | null
          source?: string
          start_time: string
          status?: string
          title: string
          updated_at?: string | null
          wa_workflow?: boolean
        }
        Update: {
          attendee_user_ids?: string[]
          confirmation_email_sent_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string
          event_type?: string | null
          google_event_id?: string | null
          google_meet_url?: string | null
          guest_email?: string | null
          guest_linkedin?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          internal_notes?: string | null
          is_all_day?: boolean
          location?: string | null
          meeting_kind?: string
          organization_id?: string
          pipeline_stage?: string | null
          prospect_id?: string | null
          source?: string
          start_time?: string
          status?: string
          title?: string
          updated_at?: string | null
          wa_workflow?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_events: {
        Row: {
          account_type: string
          chat_id: string
          created_at: string
          id: string
          message_id: string | null
          occurred_at: string
          seen_at: string | null
          user_id: string
        }
        Insert: {
          account_type?: string
          chat_id: string
          created_at?: string
          id?: string
          message_id?: string | null
          occurred_at?: string
          seen_at?: string | null
          user_id: string
        }
        Update: {
          account_type?: string
          chat_id?: string
          created_at?: string
          id?: string
          message_id?: string | null
          occurred_at?: string
          seen_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          organization_id: string
          role: string
          token: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          organization_id: string
          role?: string
          token?: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          organization_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_relations: {
        Row: {
          attendee_id: string
          connected_at: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          attendee_id: string
          connected_at?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          attendee_id?: string
          connected_at?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          category: string
          category_id: string | null
          channel: string
          content: string
          created_at: string
          created_by: string
          id: string
          is_default: boolean
          name: string
          organization_id: string
          updated_at: string
          variables_used: string[] | null
        }
        Insert: {
          category?: string
          category_id?: string | null
          channel: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
          updated_at?: string
          variables_used?: string[] | null
        }
        Update: {
          category?: string
          category_id?: string | null
          channel?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
          variables_used?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "template_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_type: string | null
          actor_id: string | null
          category: string | null
          created_at: string
          dedupe_key: string | null
          expires_at: string | null
          id: string
          message: string
          metadata: Json | null
          organization_id: string | null
          target_url: string | null
          title: string
          type: string
        }
        Insert: {
          action_type?: string | null
          actor_id?: string | null
          category?: string | null
          created_at?: string
          dedupe_key?: string | null
          expires_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          organization_id?: string | null
          target_url?: string | null
          title: string
          type?: string
        }
        Update: {
          action_type?: string | null
          actor_id?: string | null
          category?: string | null
          created_at?: string
          dedupe_key?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          organization_id?: string | null
          target_url?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          active: boolean
          created_at: string | null
          deactivated_at: string | null
          id: string
          organization_id: string
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          deactivated_at?: string | null
          id?: string
          organization_id: string
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          deactivated_at?: string | null
          id?: string
          organization_id?: string
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          credits: number | null
          current_period_end: string | null
          current_period_start: string | null
          deleted_at: string | null
          id: string
          logo_url: string | null
          max_users: number | null
          metadata: Json | null
          name: string
          owner_id: string
          plan: string | null
          scheduled_downgrade_effective_at: string | null
          scheduled_downgrade_to: string | null
          slug: string
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credits?: number | null
          current_period_end?: string | null
          current_period_start?: string | null
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          max_users?: number | null
          metadata?: Json | null
          name: string
          owner_id: string
          plan?: string | null
          scheduled_downgrade_effective_at?: string | null
          scheduled_downgrade_to?: string | null
          slug: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credits?: number | null
          current_period_end?: string | null
          current_period_start?: string | null
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          max_users?: number | null
          metadata?: Json | null
          name?: string
          owner_id?: string
          plan?: string | null
          scheduled_downgrade_effective_at?: string | null
          scheduled_downgrade_to?: string | null
          slug?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_organization_id: string | null
          avatar_url: string | null
          booking_public_path: string | null
          booking_slug: string | null
          calendar_preferences: Json
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          linkedin_access_token_encrypted: string | null
          linkedin_auto_enrich: boolean
          linkedin_id: string | null
          linkedin_refresh_token_encrypted: string | null
          linkedin_url: string | null
          metadata: Json | null
          onboarding_step: string | null
          previous_booking_paths: string[]
          previous_booking_slugs: string[]
          updated_at: string | null
        }
        Insert: {
          active_organization_id?: string | null
          avatar_url?: string | null
          booking_public_path?: string | null
          booking_slug?: string | null
          calendar_preferences?: Json
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          linkedin_access_token_encrypted?: string | null
          linkedin_auto_enrich?: boolean
          linkedin_id?: string | null
          linkedin_refresh_token_encrypted?: string | null
          linkedin_url?: string | null
          metadata?: Json | null
          onboarding_step?: string | null
          previous_booking_paths?: string[]
          previous_booking_slugs?: string[]
          updated_at?: string | null
        }
        Update: {
          active_organization_id?: string | null
          avatar_url?: string | null
          booking_public_path?: string | null
          booking_slug?: string | null
          calendar_preferences?: Json
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          linkedin_access_token_encrypted?: string | null
          linkedin_auto_enrich?: boolean
          linkedin_id?: string | null
          linkedin_refresh_token_encrypted?: string | null
          linkedin_url?: string | null
          metadata?: Json | null
          onboarding_step?: string | null
          previous_booking_paths?: string[]
          previous_booking_slugs?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_active_org"
            columns: ["active_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_activity: {
        Row: {
          action: string
          actor_id: string | null
          campaign_job_id: string | null
          created_at: string
          details: Json | null
          id: string
          organization_id: string
          prospect_id: string | null
          workflow_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          campaign_job_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          organization_id: string
          prospect_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          campaign_job_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          organization_id?: string
          prospect_id?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_activity_campaign_job_id_fkey"
            columns: ["campaign_job_id"]
            isOneToOne: false
            referencedRelation: "campaign_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_activity_campaign_job_id_fkey"
            columns: ["campaign_job_id"]
            isOneToOne: false
            referencedRelation: "prospect_in_active_campaign"
            referencedColumns: ["campaign_job_id"]
          },
          {
            foreignKeyName: "prospect_activity_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_activity_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_activity_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_statuses: {
        Row: {
          color: string
          created_at: string
          id: string
          is_archived: boolean
          key: string
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          key: string
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          key?: string
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_statuses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_tags: {
        Row: {
          created_at: string
          created_by: string | null
          prospect_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          prospect_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          prospect_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_tags_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          bdd_id: string | null
          budget: string | null
          company: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          employees: string | null
          enriched_at: string | null
          enrichment_metadata: Json | null
          enrichment_source: string | null
          full_name: string | null
          id: string
          industry: string | null
          job_title: string | null
          last_contact: string | null
          linkedin: string | null
          location: string | null
          metadata: Json | null
          notes: string | null
          organization_id: string | null
          phone: string | null
          source: string | null
          status: string | null
          status_id: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          bdd_id?: string | null
          budget?: string | null
          company?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          employees?: string | null
          enriched_at?: string | null
          enrichment_metadata?: Json | null
          enrichment_source?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          last_contact?: string | null
          linkedin?: string | null
          location?: string | null
          metadata?: Json | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          status_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          bdd_id?: string | null
          budget?: string | null
          company?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          employees?: string | null
          enriched_at?: string | null
          enrichment_metadata?: Json | null
          enrichment_source?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          last_contact?: string | null
          linkedin?: string | null
          location?: string | null
          metadata?: Json | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          status_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_bdd_id_fkey"
            columns: ["bdd_id"]
            isOneToOne: false
            referencedRelation: "bdd"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "prospect_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_bookings: {
        Row: {
          booked_at: string
          booked_by: string
          call_session_id: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          prospect_id: string
          reminder_sent_at: string | null
          scheduled_for: string | null
        }
        Insert: {
          booked_at?: string
          booked_by: string
          call_session_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          prospect_id: string
          reminder_sent_at?: string | null
          scheduled_for?: string | null
        }
        Update: {
          booked_at?: string
          booked_by?: string
          call_session_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          prospect_id?: string
          reminder_sent_at?: string | null
          scheduled_for?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_bookings_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_bookings_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      template_categories: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      unipile_attendee_cache: {
        Row: {
          cached_at: string
          chat_id: string
          id: string
          interlocutor_name: string | null
          organization_id: string
          picture_url: string | null
        }
        Insert: {
          cached_at?: string
          chat_id: string
          id?: string
          interlocutor_name?: string | null
          organization_id: string
          picture_url?: string | null
        }
        Update: {
          cached_at?: string
          chat_id?: string
          id?: string
          interlocutor_name?: string | null
          organization_id?: string
          picture_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unipile_attendee_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      unipile_chat_prospects: {
        Row: {
          created_at: string | null
          id: string
          last_inbound_at: string | null
          organization_id: string
          pinned_at: string | null
          prospect_id: string | null
          unipile_chat_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_inbound_at?: string | null
          organization_id: string
          pinned_at?: string | null
          prospect_id?: string | null
          unipile_chat_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_inbound_at?: string | null
          organization_id?: string
          pinned_at?: string | null
          prospect_id?: string | null
          unipile_chat_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipile_chat_prospects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipile_chat_prospects_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          action: string
          count: number
          created_at: string
          id: string
          last_action_at: string | null
          period_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          count?: number
          created_at?: string
          id?: string
          last_action_at?: string | null
          period_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          count?: number
          created_at?: string
          id?: string
          last_action_at?: string | null
          period_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_google_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          google_account_email: string | null
          id: string
          refresh_token: string | null
          scope: string | null
          token_expiry: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          google_account_email?: string | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_expiry?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          google_account_email?: string | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_expiry?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_google_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_unipile_accounts: {
        Row: {
          account_type: string
          cookie_payload: Json | null
          created_at: string | null
          date_last_cookie: string | null
          date_last_reconnect_attempt: string | null
          error_code: string | null
          error_message: string | null
          id: string
          is_premium: boolean
          last_status_at: string | null
          linkedin_member_id: string | null
          premium_features: string[]
          reconnect_attempts_failed: number
          status: string
          unipile_account_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_type?: string
          cookie_payload?: Json | null
          created_at?: string | null
          date_last_cookie?: string | null
          date_last_reconnect_attempt?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          is_premium?: boolean
          last_status_at?: string | null
          linkedin_member_id?: string | null
          premium_features?: string[]
          reconnect_attempts_failed?: number
          status?: string
          unipile_account_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_type?: string
          cookie_payload?: Json | null
          created_at?: string | null
          date_last_cookie?: string | null
          date_last_reconnect_attempt?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          is_premium?: boolean
          last_status_at?: string | null
          linkedin_member_id?: string | null
          premium_features?: string[]
          reconnect_attempts_failed?: number
          status?: string
          unipile_account_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          event_id: string
          provider: string
          received_at: string
        }
        Insert: {
          event_id: string
          provider: string
          received_at?: string
        }
        Update: {
          event_id?: string
          provider?: string
          received_at?: string
        }
        Relationships: []
      }
      workflow_runs: {
        Row: {
          context: Json
          created_at: string
          current_step_index: number
          definition_snapshot: Json
          enrollment_metadata: Json | null
          has_outbound_step: boolean
          id: string
          last_error: string | null
          organization_id: string
          prospect_id: string
          started_by: string
          status: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          current_step_index?: number
          definition_snapshot: Json
          enrollment_metadata?: Json | null
          has_outbound_step?: boolean
          id?: string
          last_error?: string | null
          organization_id: string
          prospect_id: string
          started_by: string
          status?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          current_step_index?: number
          definition_snapshot?: Json
          enrollment_metadata?: Json | null
          has_outbound_step?: boolean
          id?: string
          last_error?: string | null
          organization_id?: string
          prospect_id?: string
          started_by?: string
          status?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_executions: {
        Row: {
          attempts: number
          config_snapshot: Json
          created_at: string
          id: string
          idempotency_key: string
          last_error: string | null
          max_attempts: number
          processed_at: string | null
          run_after: string
          run_id: string
          status: string
          step_id: string
          step_index: number
          step_type: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          config_snapshot?: Json
          created_at?: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          max_attempts?: number
          processed_at?: string | null
          run_after?: string
          run_id: string
          status?: string
          step_id: string
          step_index: number
          step_type: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          config_snapshot?: Json
          created_at?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          max_attempts?: number
          processed_at?: string | null
          run_after?: string
          run_id?: string
          status?: string
          step_id?: string
          step_index?: number
          step_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_executions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          draft_definition: Json
          id: string
          is_active: boolean
          is_template: boolean
          metadata: Json
          name: string
          organization_id: string
          published_definition: Json | null
          run_mode: string
          trigger_config: Json
          trigger_kind: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          draft_definition?: Json
          id?: string
          is_active?: boolean
          is_template?: boolean
          metadata?: Json
          name: string
          organization_id: string
          published_definition?: Json | null
          run_mode?: string
          trigger_config?: Json
          trigger_kind?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          draft_definition?: Json
          id?: string
          is_active?: boolean
          is_template?: boolean
          metadata?: Json
          name?: string
          organization_id?: string
          published_definition?: Json | null
          run_mode?: string
          trigger_config?: Json
          trigger_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      prospect_in_active_campaign: {
        Row: {
          campaign_job_id: string | null
          campaign_status: string | null
          channel: string | null
          organization_id: string | null
          prospect_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_job_prospects_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _slugify: { Args: { name: string }; Returns: string }
      campaign_release_batch_lock: {
        Args: { p_job_id: string }
        Returns: undefined
      }
      campaign_try_acquire_batch_lock: {
        Args: { p_job_id: string; p_stale_seconds?: number }
        Returns: boolean
      }
      consume_linkedin_invite_quota: {
        Args: { p_cap: number; p_period_key: string; p_user_id: string }
        Returns: number
      }
      get_active_organization: { Args: { user_uuid?: string }; Returns: string }
      get_bdd_with_counts: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
          p_offset?: number
          p_organization_id: string
          p_proprietaire?: string
          p_search?: string
          p_source?: string
        }
        Returns: {
          avg_cycle_days: number
          contacted_count: number
          created_at: string
          delta_7d: number
          id: string
          name: string
          phones_count: number
          proprietaire: string
          prospects_count: number
          query: string
          rdv_count: number
          signed_count: number
          source: string
          total_count: number
          updated_at: string
        }[]
      }
      get_unseen_inbox_count: { Args: { p_org_id: string }; Returns: number }
      get_user_organizations: {
        Args: { user_uuid?: string }
        Returns: {
          organization_id: string
          role: string
        }[]
      }
      increment_usage_counter: {
        Args: {
          p_action: string
          p_increment?: number
          p_period_key: string
          p_user_id: string
        }
        Returns: undefined
      }
      is_admin: { Args: { user_uuid?: string }; Returns: boolean }
      mark_chat_inbox_seen: { Args: { p_chat_id: string }; Returns: undefined }
      mark_org_inbox_seen: { Args: { p_org_id: string }; Returns: undefined }
      redeem_organization_invitation: {
        Args: { p_token: string }
        Returns: Json
      }
      rpc_prospects_list_with_search: {
        Args: {
          p_bdd_id: string
          p_limit: number
          p_offset: number
          p_organization_id: string
          p_search: string
          p_sources: string[]
          p_statuses: string[]
        }
        Returns: Json
      }
      transfer_ownership: {
        Args: { p_org_id: string; p_to_user_id: string }
        Returns: Json
      }
      user_has_org_access: {
        Args: { org_id: string; user_uuid?: string }
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
