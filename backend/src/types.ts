export interface Env {
  DB: D1Database;
  SAUTH_CLIENT_ID: string;
  SAUTH_CLIENT_SECRET: string;
  FRONTEND_URL: string;
}

export interface User {
  id: string;
  email: string;
  given_name: string | null;
  family_name: string | null;
  is_admin: number;
  created_at: string;
  updated_at: string;
}

export interface TMA {
  id: number;
  name: string;
}

export interface MajorNetwork {
  id: number;
  short_name: string;
  long_name: string;
  logo_url: string | null;
}

export interface Station {
  id: number;
  callsign: string;
  station_number: number;
  marketing_name: string;
  logo_url: string | null;
  tma_id: number;
  created_at: string;
  updated_at: string;
}

export interface StationWithTMA extends Station {
  tma_name: string;
}

export interface Substation {
  id: number;
  station_id: number;
  number: number;
  marketing_name: string;
  major_network_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface SubstationWithNetwork extends Substation {
  network_short_name: string | null;
  network_long_name: string | null;
  network_logo_url: string | null;
}

export interface StationWithSubstations extends StationWithTMA {
  substations: SubstationWithNetwork[];
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

export interface SAuthUserInfo {
  sub: string;
  email: string;
  given_name: string;
  family_name: string;
  access_level: string;
}
