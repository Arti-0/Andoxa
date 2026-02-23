/**
 * Types Supabase générés à partir de migrations/def.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      bdd: {
        Row: {
          id: string;
          name: string;
          organization_id: string | null;
          proprietaire: string | null;
          source: string;
          csv_url: string | null;
          csv_hash: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          organization_id?: string | null;
          proprietaire?: string | null;
          source?: string;
          csv_url?: string | null;
          csv_hash?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          organization_id?: string | null;
          proprietaire?: string | null;
          source?: string;
          csv_url?: string | null;
          csv_hash?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          linkedin_id: string | null;
          linkedin_url: string | null;
          linkedin_access_token_encrypted: string | null;
          linkedin_refresh_token_encrypted: string | null;
          active_organization_id: string | null;
          metadata: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          linkedin_id?: string | null;
          linkedin_url?: string | null;
          linkedin_access_token_encrypted?: string | null;
          linkedin_refresh_token_encrypted?: string | null;
          active_organization_id?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          linkedin_id?: string | null;
          linkedin_url?: string | null;
          linkedin_access_token_encrypted?: string | null;
          linkedin_refresh_token_encrypted?: string | null;
          active_organization_id?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          status: string | null;
          deleted_at: string | null;
          created_at: string | null;
          updated_at: string | null;
          plan: string | null;
          subscription_status: string | null;
          trial_ends_at: string | null;
          credits: number | null;
          slug: string | null;
          logo_url: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          max_users: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          status?: string | null;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          plan?: string | null;
          subscription_status?: string | null;
          trial_ends_at?: string | null;
          credits?: number | null;
          slug?: string | null;
          logo_url?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          max_users?: number | null;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          status?: string | null;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          plan?: string | null;
          subscription_status?: string | null;
          trial_ends_at?: string | null;
          credits?: number | null;
          slug?: string | null;
          logo_url?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          max_users?: number | null;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      prospects: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string | null;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          company: string | null;
          job_title: string | null;
          linkedin: string | null;
          location: string | null;
          website: string | null;
          industry: string | null;
          employees: string | null;
          budget: string | null;
          tags: string[] | null;
          status: string | null;
          priority: string | null;
          estimated_value: number | null;
          notes: string | null;
          last_contact: string | null;
          enriched_at: string | null;
          enrichment_source: string | null;
          enrichment_metadata: Json | null;
          metadata: Json | null;
          deleted_at: string | null;
          created_at: string | null;
          updated_at: string | null;
          bdd_id: string | null;
          source: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id?: string | null;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          job_title?: string | null;
          linkedin?: string | null;
          location?: string | null;
          website?: string | null;
          industry?: string | null;
          employees?: string | null;
          budget?: string | null;
          tags?: string[] | null;
          status?: string | null;
          priority?: string | null;
          estimated_value?: number | null;
          notes?: string | null;
          last_contact?: string | null;
          enriched_at?: string | null;
          enrichment_source?: string | null;
          enrichment_metadata?: Json | null;
          metadata?: Json | null;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          bdd_id?: string | null;
          source?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string | null;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          job_title?: string | null;
          linkedin?: string | null;
          location?: string | null;
          website?: string | null;
          industry?: string | null;
          employees?: string | null;
          budget?: string | null;
          tags?: string[] | null;
          status?: string | null;
          priority?: string | null;
          estimated_value?: number | null;
          notes?: string | null;
          last_contact?: string | null;
          enriched_at?: string | null;
          enrichment_source?: string | null;
          enrichment_metadata?: Json | null;
          metadata?: Json | null;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          bdd_id?: string | null;
          source?: string | null;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string | null;
          name: string;
          subject: string | null;
          content: Json | null;
          status: string | null;
          target_tags: string[] | null;
          target_prospect_ids: string[] | null;
          from_email: string | null;
          from_name: string | null;
          reply_to_email: string | null;
          stats: Json | null;
          scheduled_at: string | null;
          sent_at: string | null;
          completed_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id?: string | null;
          name: string;
          subject?: string | null;
          content?: Json | null;
          status?: string | null;
          target_tags?: string[] | null;
          target_prospect_ids?: string[] | null;
          from_email?: string | null;
          from_name?: string | null;
          reply_to_email?: string | null;
          stats?: Json | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string | null;
          name?: string;
          subject?: string | null;
          content?: Json | null;
          status?: string | null;
          target_tags?: string[] | null;
          target_prospect_ids?: string[] | null;
          from_email?: string | null;
          from_name?: string | null;
          reply_to_email?: string | null;
          stats?: Json | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          trial_end: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          status: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          trial_end?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          trial_end?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      enrichment_credits: {
        Row: {
          user_id: string;
          credits_available: number;
          credits_used: number;
          last_reset_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          credits_available?: number;
          credits_used?: number;
          last_reset_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string;
          credits_available?: number;
          credits_used?: number;
          last_reset_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string | null;
          linkedin_url: string | null;
          role: string;
          token: string | null;
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email?: string | null;
          linkedin_url?: string | null;
          role?: string;
          token?: string | null;
          invited_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string | null;
          linkedin_url?: string | null;
          role?: string;
          token?: string | null;
          invited_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          description: string | null;
          start_time: string;
          end_time: string;
          prospect_id: string | null;
          location: string | null;
          is_all_day: boolean;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          description?: string | null;
          start_time: string;
          end_time: string;
          prospect_id?: string | null;
          location?: string | null;
          is_all_day?: boolean;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          title?: string;
          description?: string | null;
          start_time?: string;
          end_time?: string;
          prospect_id?: string | null;
          location?: string | null;
          is_all_day?: boolean;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      campaign_replies: {
        Row: {
          id: string;
          organization_id: string;
          received_at: string | null;
          is_read: boolean;
          is_archived: boolean;
          campaign?: { name: string } | null;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          received_at?: string | null;
          is_read?: boolean;
          is_archived?: boolean;
        };
        Update: {
          id?: string;
          organization_id?: string;
          received_at?: string | null;
          is_read?: boolean;
          is_archived?: boolean;
        };
        Relationships: [];
      };
      unipile_chat_prospects: {
        Row: {
          id: string;
          prospect_id: string;
          unipile_chat_id: string;
          organization_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          prospect_id: string;
          unipile_chat_id: string;
          organization_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          prospect_id?: string;
          unipile_chat_id?: string;
          organization_id?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      user_unipile_accounts: {
        Row: {
          id: string;
          user_id: string;
          unipile_account_id: string;
          account_type: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          unipile_account_id: string;
          account_type?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          unipile_account_id?: string;
          account_type?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      call_sessions: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string;
          created_at: string | null;
          ended_at: string | null;
          title: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          created_by: string;
          created_at?: string | null;
          ended_at?: string | null;
          title?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          created_by?: string;
          created_at?: string | null;
          ended_at?: string | null;
          title?: string | null;
        };
        Relationships: [];
      };
      call_session_prospects: {
        Row: {
          id: string;
          call_session_id: string;
          prospect_id: string;
        };
        Insert: {
          id?: string;
          call_session_id: string;
          prospect_id: string;
        };
        Update: {
          id?: string;
          call_session_id?: string;
          prospect_id?: string;
        };
        Relationships: [];
      };
      call_session_notes: {
        Row: {
          id: string;
          call_session_id: string;
          prospect_id: string;
          author_id: string;
          content: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          call_session_id: string;
          prospect_id: string;
          author_id: string;
          content?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          call_session_id?: string;
          prospect_id?: string;
          author_id?: string;
          content?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_or_create_credits: {
        Args: { p_organization_id: string };
        Returns: number | { credits_available: number } | Array<{ credits_available: number }>;
      };
    };
    Enums: Record<string, never>;
  };
}
