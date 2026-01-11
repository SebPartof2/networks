export type TMAStatus = 'not_implemented' | 'in_progress' | 'complete';

export interface TMA {
  id: number;
  name: string;
  status: TMAStatus;
}

export interface MajorNetwork {
  id: number;
  short_name: string;
  long_name: string;
  logo_url: string | null;
  affiliate_count?: number;
}

export interface StationGroup {
  id: number;
  name: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Station {
  id: number;
  callsign: string;
  station_number: number;
  marketing_name: string;
  logo_url: string | null;
  tma_id: number;
  tma_name: string;
  station_group_id: number | null;
  station_group_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Substation {
  id: number;
  station_id: number | null;
  station_group_id: number | null;
  number: number;
  marketing_name: string;
  major_network_id: number | null;
  network_short_name: string | null;
  network_long_name: string | null;
  network_logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StationWithSubstations extends Station {
  substations: Substation[];
}

export interface StationGroupWithDetails extends StationGroup {
  stations: Station[];
  substations: Substation[];
}

export interface User {
  id: string;
  email: string;
  given_name: string | null;
  family_name: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Feedback {
  id: number;
  user_id: string;
  tma_name: string;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface FeedbackWithUser extends Feedback {
  user_email: string;
  user_given_name: string | null;
  user_family_name: string | null;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

// Network affiliate (substation with parent station info)
export interface NetworkAffiliate {
  id: number;
  number: number;
  marketing_name: string;
  station_id: number;
  station_callsign: string;
  station_number: number;
  station_marketing_name: string;
  station_logo_url: string | null;
  tma_id: number;
  tma_name: string;
}

export interface NetworkWithAffiliates extends MajorNetwork {
  affiliates: NetworkAffiliate[];
}
