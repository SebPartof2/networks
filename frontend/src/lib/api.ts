import { TMA, TMAStatus, Station, StationWithSubstations, MajorNetwork, NetworkWithAffiliates, User, Feedback, FeedbackWithUser, StationGroup, StationGroupWithDetails } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Public endpoints
export const api = {
  // TMAs
  getTmas: () => fetchApi<TMA[]>('/api/tmas'),
  getTma: (id: number) => fetchApi<TMA>(`/api/tmas/${id}`),
  getTmaStations: (id: number) => fetchApi<{ tma: TMA; stations: Station[] }>(`/api/tmas/${id}/stations`),

  // Stations
  searchStations: (query?: string, tmaId?: number) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (tmaId) params.set('tma_id', String(tmaId));
    const queryString = params.toString();
    return fetchApi<Station[]>(`/api/stations${queryString ? `?${queryString}` : ''}`);
  },
  getStation: (id: number) => fetchApi<StationWithSubstations>(`/api/stations/${id}`),

  // Networks
  getNetworks: () => fetchApi<MajorNetwork[]>('/api/networks'),
  getNetwork: (id: number) => fetchApi<NetworkWithAffiliates>(`/api/networks/${id}`),

  // Station Groups
  getStationGroups: () => fetchApi<StationGroup[]>('/api/station-groups'),

  // Authenticated endpoints
  getCurrentUser: () => fetchApi<User>('/api/users/me'),
  submitFeedback: (data: { tma_name: string; description?: string }) =>
    fetchApi<Feedback>('/api/feedback', { method: 'POST', body: JSON.stringify(data) }),
  getMyFeedback: () => fetchApi<Feedback[]>('/api/feedback/mine'),

  // Admin endpoints
  admin: {
    // Stations
    createStation: (data: { callsign: string; station_number: number; marketing_name: string; logo_url?: string; tma_id: number; station_group_id?: number | null }) =>
      fetchApi<Station>('/api/admin/stations', { method: 'POST', body: JSON.stringify(data) }),
    updateStation: (id: number, data: Partial<{ callsign: string; station_number: number; marketing_name: string; logo_url: string | null; tma_id: number; station_group_id: number | null }>) =>
      fetchApi<Station>(`/api/admin/stations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteStation: (id: number) =>
      fetchApi<{ success: boolean }>(`/api/admin/stations/${id}`, { method: 'DELETE' }),

    // Substations
    createSubstation: (data: { station_id?: number | null; station_group_id?: number | null; number: number; marketing_name: string; major_network_id?: number | null }) =>
      fetchApi<{ id: number }>('/api/admin/substations', { method: 'POST', body: JSON.stringify(data) }),
    updateSubstation: (id: number, data: Partial<{ number: number; marketing_name: string; major_network_id: number | null }>) =>
      fetchApi<{ id: number }>(`/api/admin/substations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteSubstation: (id: number) =>
      fetchApi<{ success: boolean }>(`/api/admin/substations/${id}`, { method: 'DELETE' }),

    // Networks
    createNetwork: (data: { short_name: string; long_name: string; logo_url?: string }) =>
      fetchApi<MajorNetwork>('/api/admin/networks', { method: 'POST', body: JSON.stringify(data) }),
    updateNetwork: (id: number, data: Partial<{ short_name: string; long_name: string; logo_url: string | null }>) =>
      fetchApi<MajorNetwork>(`/api/admin/networks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteNetwork: (id: number) =>
      fetchApi<{ success: boolean }>(`/api/admin/networks/${id}`, { method: 'DELETE' }),

    // Station Groups
    getStationGroups: () => fetchApi<StationGroup[]>('/api/admin/station-groups'),
    getStationGroup: (id: number) => fetchApi<StationGroupWithDetails>(`/api/admin/station-groups/${id}`),
    createStationGroup: (data: { name: string; logo_url?: string }) =>
      fetchApi<StationGroup>('/api/admin/station-groups', { method: 'POST', body: JSON.stringify(data) }),
    updateStationGroup: (id: number, data: Partial<{ name: string; logo_url: string | null }>) =>
      fetchApi<StationGroup>(`/api/admin/station-groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteStationGroup: (id: number) =>
      fetchApi<{ success: boolean }>(`/api/admin/station-groups/${id}`, { method: 'DELETE' }),

    // Users
    getUsers: () => fetchApi<User[]>('/api/admin/users'),
    updateUser: (id: string, data: { is_admin: boolean }) =>
      fetchApi<User>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    // Feedback
    getFeedback: (status?: string) => {
      const params = status ? `?status=${status}` : '';
      return fetchApi<FeedbackWithUser[]>(`/api/admin/feedback${params}`);
    },
    updateFeedback: (id: number, data: { status: 'pending' | 'approved' | 'rejected' }) =>
      fetchApi<Feedback>(`/api/admin/feedback/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    // TMAs
    updateTMAStatus: (id: number, status: TMAStatus) =>
      fetchApi<TMA>(`/api/admin/tmas/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
};
