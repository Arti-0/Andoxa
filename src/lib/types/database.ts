// Database types for type safety
export interface DatabaseProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseTenant {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseBDD {
  id: string;
  name: string;
  description: string | null;
  proprietaire: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface DatabaseProspect {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  phone: string | null;
  bdd_id: string | null;
  proprietaire: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface DatabaseCampaign {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed" | "scheduled" | "sending";
  owner_id: string;
  organization_id: string;
  content: {
    title: string;
    message: string;
  } | null;
  target_audience: {
    selectedBdds: string[];
    audienceSize: number;
  } | null;
  delivery_settings: {
    startDate: string | null;
    endDate: string | null;
    maxEmailsPerDay: number;
    emailInterval: number;
    workingHours: {
      start: string;
      end: string;
    };
    selectedDays: string[];
  } | null;
  stats: {
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  } | null;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CampaignSendResponse {
  success: boolean;
  message: string;
  stats: {
    total: number;
    sent: number;
    failed: number;
  };
  errors?: string[];
}
