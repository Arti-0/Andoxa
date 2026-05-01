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
            campaign_jobs: {
                Row: {
                    id: string;
                    organization_id: string;
                    created_by: string;
                    type:
                        | 'invite'
                        | 'invite_with_note'
                        | 'contact'
                        | 'whatsapp';
                    status:
                        | 'draft'
                        | 'pending'
                        | 'running'
                        | 'paused'
                        | 'completed'
                        | 'failed';
                    total_count: number;
                    processed_count: number;
                    success_count: number;
                    error_count: number;
                    batch_size: number;
                    delay_ms: number;
                    message_template: string | null;
                    metadata: Json | null;
                    started_at: string | null;
                    completed_at: string | null;
                    created_at: string;
                    last_batch_at: string | null;
                    batch_lock_at: string | null;
                };
                Insert: {
                    id?: string;
                    organization_id: string;
                    created_by: string;
                    type:
                        | 'invite'
                        | 'invite_with_note'
                        | 'contact'
                        | 'whatsapp';
                    status?: string;
                    total_count?: number;
                    processed_count?: number;
                    success_count?: number;
                    error_count?: number;
                    batch_size?: number;
                    delay_ms?: number;
                    message_template?: string | null;
                    metadata?: Json | null;
                    started_at?: string | null;
                    completed_at?: string | null;
                    created_at?: string;
                    last_batch_at?: string | null;
                    batch_lock_at?: string | null;
                };
                Update: {
                    status?: string;
                    processed_count?: number;
                    success_count?: number;
                    error_count?: number;
                    started_at?: string | null;
                    completed_at?: string | null;
                    metadata?: Json | null;
                    last_batch_at?: string | null;
                    batch_lock_at?: string | null;
                };
                Relationships: [];
            };
            usage_counters: {
                Row: {
                    id: string;
                    user_id: string;
                    action: string;
                    period_key: string;
                    count: number;
                    last_action_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    action: string;
                    period_key: string;
                    count?: number;
                    last_action_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    action?: string;
                    period_key?: string;
                    count?: number;
                    last_action_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            campaign_job_prospects: {
                Row: {
                    id: string;
                    job_id: string;
                    prospect_id: string;
                    status:
                        | 'pending'
                        | 'processing'
                        | 'success'
                        | 'error'
                        | 'skipped';
                    error: string | null;
                    processed_at: string | null;
                };
                Insert: {
                    id?: string;
                    job_id: string;
                    prospect_id: string;
                    status?: string;
                    error?: string | null;
                    processed_at?: string | null;
                };
                Update: {
                    status?: string;
                    error?: string | null;
                    processed_at?: string | null;
                };
                Relationships: [];
            };
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
                    booking_slug: string | null;
                    linkedin_id: string | null;
                    linkedin_url: string | null;
                    linkedin_access_token_encrypted: string | null;
                    linkedin_refresh_token_encrypted: string | null;
                    active_organization_id: string | null;
                    onboarding_step: string | null;
                    linkedin_auto_enrich: boolean;
                    metadata: Json | null;
                    calendar_preferences: Json;
                    created_at: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    id: string;
                    email?: string | null;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    booking_slug?: string | null;
                    linkedin_id?: string | null;
                    linkedin_url?: string | null;
                    linkedin_access_token_encrypted?: string | null;
                    linkedin_refresh_token_encrypted?: string | null;
                    active_organization_id?: string | null;
                    onboarding_step?: string | null;
                    linkedin_auto_enrich?: boolean;
                    metadata?: Json | null;
                    calendar_preferences?: Json;
                    created_at?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    id?: string;
                    email?: string | null;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    booking_slug?: string | null;
                    linkedin_id?: string | null;
                    linkedin_url?: string | null;
                    linkedin_access_token_encrypted?: string | null;
                    linkedin_refresh_token_encrypted?: string | null;
                    active_organization_id?: string | null;
                    onboarding_step?: string | null;
                    linkedin_auto_enrich?: boolean;
                    metadata?: Json | null;
                    calendar_preferences?: Json;
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
                    metadata: Json | null;
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
                    metadata?: Json | null;
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
                    metadata?: Json | null;
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
            prospect_activity: {
                Row: {
                    id: string;
                    organization_id: string;
                    prospect_id: string | null;
                    workflow_id: string | null;
                    actor_id: string | null;
                    action: string;
                    details: Json;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    organization_id: string;
                    prospect_id?: string | null;
                    workflow_id?: string | null;
                    actor_id?: string | null;
                    action: string;
                    details?: Json;
                    created_at?: string;
                };
                Update: {
                    details?: Json;
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
            enrichment_jobs: {
                Row: {
                    id: string;
                    organization_id: string;
                    prospect_id: string;
                    requested_by_user_id: string;
                    bdd_id: string | null;
                    status: string;
                    attempts: number;
                    max_attempts: number;
                    run_after: string;
                    last_error: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    organization_id: string;
                    prospect_id: string;
                    requested_by_user_id: string;
                    bdd_id?: string | null;
                    status?: string;
                    attempts?: number;
                    max_attempts?: number;
                    run_after?: string;
                    last_error?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    organization_id?: string;
                    prospect_id?: string;
                    requested_by_user_id?: string;
                    bdd_id?: string | null;
                    status?: string;
                    attempts?: number;
                    max_attempts?: number;
                    run_after?: string;
                    last_error?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            invitations: {
                Row: {
                    id: string;
                    token: string;
                    organization_id: string;
                    email: string;
                    role: string;
                    created_at: string;
                    expires_at: string;
                    consumed_at: string | null;
                };
                Insert: {
                    id?: string;
                    token?: string;
                    organization_id: string;
                    email: string;
                    role?: string;
                    created_at?: string;
                    expires_at: string;
                    consumed_at?: string | null;
                };
                Update: {
                    id?: string;
                    token?: string;
                    organization_id?: string;
                    email?: string;
                    role?: string;
                    created_at?: string;
                    expires_at?: string;
                    consumed_at?: string | null;
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
                    source: string | null;
                    guest_name: string | null;
                    guest_email: string | null;
                    guest_linkedin: string | null;
                    guest_phone: string | null;
                    google_meet_url: string | null;
                    google_event_id: string | null;
                    confirmation_email_sent_at: string | null;
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
                    source?: string | null;
                    guest_name?: string | null;
                    guest_email?: string | null;
                    guest_linkedin?: string | null;
                    guest_phone?: string | null;
                    google_meet_url?: string | null;
                    google_event_id?: string | null;
                    confirmation_email_sent_at?: string | null;
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
                    source?: string | null;
                    guest_name?: string | null;
                    guest_email?: string | null;
                    guest_linkedin?: string | null;
                    guest_phone?: string | null;
                    google_meet_url?: string | null;
                    google_event_id?: string | null;
                    confirmation_email_sent_at?: string | null;
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
            inbox_events: {
                Row: {
                    id: string;
                    user_id: string;
                    chat_id: string;
                    account_type: string;
                    message_id: string | null;
                    occurred_at: string;
                    seen_at: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    chat_id: string;
                    account_type?: string;
                    message_id?: string | null;
                    occurred_at?: string;
                    seen_at?: string | null;
                    created_at?: string;
                };
                Update: {
                    seen_at?: string | null;
                };
                Relationships: [];
            };
            linkedin_relations: {
                Row: {
                    id: string;
                    user_id: string;
                    attendee_id: string;
                    connected_at: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    attendee_id: string;
                    connected_at?: string;
                    created_at?: string;
                };
                Update: {
                    connected_at?: string;
                };
                Relationships: [];
            };
            unipile_attendee_cache: {
                Row: {
                    id: string;
                    organization_id: string;
                    chat_id: string;
                    interlocutor_name: string | null;
                    picture_url: string | null;
                    cached_at: string;
                };
                Insert: {
                    id?: string;
                    organization_id: string;
                    chat_id: string;
                    interlocutor_name?: string | null;
                    picture_url?: string | null;
                    cached_at?: string;
                };
                Update: {
                    interlocutor_name?: string | null;
                    picture_url?: string | null;
                    cached_at?: string;
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
                    last_inbound_at: string | null;
                };
                Insert: {
                    id?: string;
                    prospect_id: string;
                    unipile_chat_id: string;
                    organization_id: string;
                    created_at?: string | null;
                    last_inbound_at?: string | null;
                };
                Update: {
                    id?: string;
                    prospect_id?: string;
                    unipile_chat_id?: string;
                    organization_id?: string;
                    created_at?: string | null;
                    last_inbound_at?: string | null;
                };
                Relationships: [];
            };
            user_google_tokens: {
                Row: {
                    id: string;
                    user_id: string;
                    access_token: string;
                    refresh_token: string | null;
                    token_expiry: string | null;
                    scope: string | null;
                    google_account_email: string | null;
                    created_at: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    access_token: string;
                    refresh_token?: string | null;
                    token_expiry?: string | null;
                    scope?: string | null;
                    google_account_email?: string | null;
                    created_at?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    access_token?: string;
                    refresh_token?: string | null;
                    token_expiry?: string | null;
                    scope?: string | null;
                    google_account_email?: string | null;
                    created_at?: string | null;
                    updated_at?: string | null;
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
                    status: string;
                    error_code: string | null;
                    error_message: string | null;
                    last_status_at: string | null;
                    is_premium: boolean;
                    premium_features: string[];
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    unipile_account_id: string;
                    account_type?: string;
                    created_at?: string | null;
                    updated_at?: string | null;
                    status?: string;
                    error_code?: string | null;
                    error_message?: string | null;
                    last_status_at?: string | null;
                    is_premium?: boolean;
                    premium_features?: string[];
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    unipile_account_id?: string;
                    account_type?: string;
                    created_at?: string | null;
                    updated_at?: string | null;
                    status?: string;
                    error_code?: string | null;
                    error_message?: string | null;
                    last_status_at?: string | null;
                    is_premium?: boolean;
                    premium_features?: string[];
                };
                Relationships: [];
            };
            workflow_runs: {
                Row: {
                    id: string;
                    workflow_id: string;
                    organization_id: string;
                    prospect_id: string;
                    started_by: string;
                    status:
                        | 'pending'
                        | 'running'
                        | 'paused'
                        | 'completed'
                        | 'failed'
                        | 'cancelled';
                    current_step_index: number;
                    context: Json;
                    definition_snapshot: Json;
                    last_error: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    workflow_id: string;
                    organization_id: string;
                    prospect_id: string;
                    started_by: string;
                    status?: string;
                    current_step_index?: number;
                    context?: Json;
                    definition_snapshot: Json;
                    last_error?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    status?: string;
                    current_step_index?: number;
                    context?: Json;
                    last_error?: string | null;
                    updated_at?: string;
                };
                Relationships: [];
            };
            workflow_step_executions: {
                Row: {
                    id: string;
                    run_id: string;
                    step_index: number;
                    step_id: string;
                    step_type: string;
                    config_snapshot: Json;
                    status:
                        | 'pending'
                        | 'processing'
                        | 'completed'
                        | 'failed'
                        | 'cancelled';
                    run_after: string;
                    attempts: number;
                    max_attempts: number;
                    last_error: string | null;
                    idempotency_key: string;
                    processed_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    run_id: string;
                    step_index: number;
                    step_id: string;
                    step_type: string;
                    config_snapshot?: Json;
                    status?: string;
                    run_after?: string;
                    attempts?: number;
                    max_attempts?: number;
                    last_error?: string | null;
                    idempotency_key: string;
                    processed_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    status?: string;
                    run_after?: string;
                    attempts?: number;
                    last_error?: string | null;
                    processed_at?: string | null;
                    updated_at?: string;
                };
                Relationships: [];
            };
            workflows: {
                Row: {
                    id: string;
                    organization_id: string;
                    name: string;
                    description: string | null;
                    is_template: boolean;
                    is_active: boolean;
                    created_by: string;
                    draft_definition: Json;
                    published_definition: Json | null;
                    metadata: Json;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    organization_id: string;
                    name: string;
                    description?: string | null;
                    is_template?: boolean;
                    is_active?: boolean;
                    created_by: string;
                    draft_definition?: Json;
                    published_definition?: Json | null;
                    metadata?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    name?: string;
                    description?: string | null;
                    is_template?: boolean;
                    is_active?: boolean;
                    draft_definition?: Json;
                    published_definition?: Json | null;
                    metadata?: Json;
                    updated_at?: string;
                };
                Relationships: [];
            };
            call_sessions: {
                Row: {
                    id: string;
                    organization_id: string;
                    created_by: string;
                    created_at: string;
                    ended_at: string | null;
                    title: string | null;
                    total_duration_s: number | null;
                    status: 'active' | 'running' | 'paused' | 'completed';
                };
                Insert: {
                    id?: string;
                    organization_id: string;
                    created_by: string;
                    created_at?: string;
                    ended_at?: string | null;
                    title?: string | null;
                    total_duration_s?: number | null;
                    status?: 'active' | 'running' | 'paused' | 'completed';
                };
                Update: {
                    ended_at?: string | null;
                    title?: string | null;
                    total_duration_s?: number | null;
                    status?: 'active' | 'running' | 'paused' | 'completed';
                };
                Relationships: [];
            };
            call_session_prospects: {
                Row: {
                    id: string;
                    call_session_id: string;
                    prospect_id: string;
                    call_duration_s: number;
                    status: string;
                    called_at: string | null;
                    outcome: string | null;
                };
                Insert: {
                    id?: string;
                    call_session_id: string;
                    prospect_id: string;
                    call_duration_s?: number;
                    status?: string;
                    called_at?: string | null;
                    outcome?: string | null;
                };
                Update: {
                    id?: string;
                    call_session_id?: string;
                    prospect_id?: string;
                    call_duration_s?: number;
                    status?: string;
                    called_at?: string | null;
                    outcome?: string | null;
                };
                Relationships: [];
            };
            quick_bookings: {
                Row: {
                    id: string;
                    organization_id: string;
                    prospect_id: string;
                    call_session_id: string | null;
                    booked_by: string;
                    booked_at: string;
                    scheduled_for: string | null;
                    notes: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    organization_id: string;
                    prospect_id: string;
                    call_session_id?: string | null;
                    booked_by: string;
                    booked_at?: string;
                    scheduled_for?: string | null;
                    notes?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    organization_id?: string;
                    prospect_id?: string;
                    call_session_id?: string | null;
                    booked_by?: string;
                    booked_at?: string;
                    scheduled_for?: string | null;
                    notes?: string | null;
                    created_at?: string;
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
            notifications: {
                Row: {
                    id: string;
                    title: string;
                    message: string;
                    type: string;
                    category: string | null;
                    action_type: string | null;
                    actor_id: string | null;
                    organization_id: string | null;
                    target_url: string | null;
                    metadata: Json;
                    created_at: string;
                    expires_at: string | null;
                };
                Insert: {
                    id?: string;
                    title: string;
                    message: string;
                    type?: string;
                    category?: string | null;
                    action_type?: string | null;
                    actor_id?: string | null;
                    organization_id?: string | null;
                    target_url?: string | null;
                    metadata?: Json;
                    created_at?: string;
                    expires_at?: string | null;
                };
                Update: {
                    id?: string;
                    title?: string;
                    message?: string;
                    type?: string;
                    category?: string | null;
                    action_type?: string | null;
                    actor_id?: string | null;
                    organization_id?: string | null;
                    target_url?: string | null;
                    metadata?: Json;
                    created_at?: string;
                    expires_at?: string | null;
                };
                Relationships: [];
            };
            notification_reads: {
                Row: {
                    id: string;
                    notification_id: string;
                    user_id: string;
                    read_at: string;
                };
                Insert: {
                    id?: string;
                    notification_id: string;
                    user_id: string;
                    read_at?: string;
                };
                Update: {
                    id?: string;
                    notification_id?: string;
                    user_id?: string;
                    read_at?: string;
                };
                Relationships: [];
            };
            announcements: {
                Row: {
                    id: string;
                    title: string;
                    message: string;
                    type: string;
                    active: boolean;
                    starts_at: string;
                    ends_at: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    title: string;
                    message: string;
                    type?: string;
                    active?: boolean;
                    starts_at?: string;
                    ends_at?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    title?: string;
                    message?: string;
                    type?: string;
                    active?: boolean;
                    starts_at?: string;
                    ends_at?: string | null;
                    created_at?: string;
                };
                Relationships: [];
            };
            message_templates: {
                Row: {
                    id: string;
                    organization_id: string;
                    created_by: string;
                    name: string;
                    channel: string;
                    content: string;
                    variables_used: string[];
                    is_default: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    organization_id: string;
                    created_by: string;
                    name: string;
                    channel: string;
                    content: string;
                    variables_used?: string[];
                    is_default?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    organization_id?: string;
                    created_by?: string;
                    name?: string;
                    channel?: string;
                    content?: string;
                    variables_used?: string[];
                    is_default?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
        };
        Views: Record<string, never>;
        Functions: {
            redeem_organization_invitation: {
                Args: { p_token: string };
                Returns: Json;
            };
            campaign_try_acquire_batch_lock: {
                Args: { p_job_id: string; p_stale_seconds?: number };
                Returns: boolean;
            };
            campaign_release_batch_lock: {
                Args: { p_job_id: string };
                Returns: undefined;
            };
            increment_usage_counter: {
                Args: {
                    p_user_id: string;
                    p_action: string;
                    p_period_key: string;
                    p_increment?: number;
                };
                Returns: undefined;
            };
            get_or_create_credits: {
                Args: { p_organization_id: string };
                Returns:
                    | number
                    | { credits_available: number }
                    | Array<{ credits_available: number }>;
            };
            rpc_prospects_list_with_search: {
                Args: {
                    p_organization_id: string;
                    p_search: string;
                    p_limit: number;
                    p_offset: number;
                    p_bdd_id: string | null;
                    p_statuses: string[] | null;
                    p_sources: string[] | null;
                };
                Returns: Json;
            };
            get_bdd_with_counts: {
                Args: {
                    p_organization_id: string;
                    p_limit?: number;
                    p_offset?: number;
                    p_search?: string | null;
                    p_source?: string | null;
                    p_proprietaire?: string | null;
                    p_date_from?: string | null;
                    p_date_to?: string | null;
                };
                Returns: {
                    id: string;
                    name: string;
                    source: string;
                    proprietaire: string | null;
                    created_at: string | null;
                    updated_at: string | null;
                    prospects_count: number;
                    phones_count: number;
                    total_count: number;
                }[];
            };
            get_unseen_inbox_count: {
                Args: { p_org_id: string };
                Returns: number;
            };
            mark_chat_inbox_seen: {
                Args: { p_chat_id: string };
                Returns: undefined;
            };
            mark_org_inbox_seen: {
                Args: { p_org_id: string };
                Returns: undefined;
            };
        };
        Enums: Record<string, never>;
    };
}
