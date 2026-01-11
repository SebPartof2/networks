import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Station, TMA, MajorNetwork, StationWithSubstations, Substation, StationGroup } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { NetworkPicker } from '../../components/NetworkPicker';

interface StationFormData {
  callsign: string;
  station_number: number | '';
  marketing_name: string;
  logo_url: string;
  tma_id: number | '';
  station_group_id: number | '' | null;
}

interface SubstationFormData {
  number: number | '';
  marketing_name: string;
  major_network_id: number | null;
}

export function AdminStations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stations, setStations] = useState<Station[]>([]);
  const [tmas, setTmas] = useState<TMA[]>([]);
  const [networks, setNetworks] = useState<MajorNetwork[]>([]);
  const [stationGroups, setStationGroups] = useState<StationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get filter from URL params
  const filterTmaId = searchParams.get('tma') || '';
  const stationIdParam = searchParams.get('station') || '';

  // Update URL when filter changes
  const setFilterTmaId = (value: string) => {
    const params: Record<string, string> = {};
    if (value) params.tma = value;
    // Clear station when changing TMA filter
    setSearchParams(params);
  };

  // Update URL when station is selected
  const setStationIdParam = (stationId: number | null) => {
    const params: Record<string, string> = {};
    if (filterTmaId) params.tma = filterTmaId;
    if (stationId) params.station = stationId.toString();
    setSearchParams(params);
  };

  const [showStationModal, setShowStationModal] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [stationForm, setStationForm] = useState<StationFormData>({
    callsign: '',
    station_number: '',
    marketing_name: '',
    logo_url: '',
    tma_id: '',
    station_group_id: null,
  });

  const [selectedStation, setSelectedStation] = useState<StationWithSubstations | null>(null);
  const [showSubstationModal, setShowSubstationModal] = useState(false);
  const [editingSubstation, setEditingSubstation] = useState<Substation | null>(null);
  const [substationForm, setSubstationForm] = useState<SubstationFormData>({
    number: '',
    marketing_name: '',
    major_network_id: null,
  });

  const [submitting, setSubmitting] = useState(false);

  // Filter stations by selected TMA
  const filteredStations = useMemo(() => {
    if (!filterTmaId) return stations;
    return stations.filter((s) => s.tma_id === parseInt(filterTmaId, 10));
  }, [stations, filterTmaId]);

  useEffect(() => {
    Promise.all([
      api.searchStations(),
      api.getTmas(),
      api.getNetworks(),
      api.getStationGroups(),
    ])
      .then(([stationsData, tmasData, networksData, groupsData]) => {
        setStations(stationsData);
        setTmas(tmasData);
        setNetworks(networksData);
        setStationGroups(groupsData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Load station from URL param on initial load
  useEffect(() => {
    if (stationIdParam && !loading && !selectedStation) {
      const stationId = parseInt(stationIdParam, 10);
      if (!isNaN(stationId)) {
        api.getStation(stationId)
          .then(setSelectedStation)
          .catch(() => {
            // Station not found, clear from URL
            setStationIdParam(null);
          });
      }
    }
  }, [stationIdParam, loading, selectedStation]);

  const handleAddStation = () => {
    setEditingStation(null);
    setStationForm({
      callsign: '',
      station_number: '',
      marketing_name: '',
      logo_url: '',
      tma_id: filterTmaId ? parseInt(filterTmaId, 10) : '',
      station_group_id: null,
    });
    setShowStationModal(true);
  };

  const handleEditStation = (station: Station) => {
    setEditingStation(station);
    setStationForm({
      callsign: station.callsign,
      station_number: station.station_number,
      marketing_name: station.marketing_name,
      logo_url: station.logo_url || '',
      tma_id: station.tma_id,
      station_group_id: station.station_group_id,
    });
    setShowStationModal(true);
  };

  const handleSubmitStation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = {
        callsign: stationForm.callsign,
        station_number: stationForm.station_number as number,
        marketing_name: stationForm.marketing_name,
        logo_url: stationForm.logo_url || undefined,
        tma_id: stationForm.tma_id as number,
        station_group_id: stationForm.station_group_id ? (stationForm.station_group_id as number) : null,
      };

      if (editingStation) {
        await api.admin.updateStation(editingStation.id, data);
      } else {
        await api.admin.createStation(data);
      }

      const updated = await api.searchStations();
      setStations(updated);
      setShowStationModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save station');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStation = async (id: number) => {
    if (!confirm('Are you sure you want to delete this station?')) return;

    try {
      await api.admin.deleteStation(id);
      setStations(stations.filter((s) => s.id !== id));
      if (selectedStation?.id === id) {
        setSelectedStation(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete station');
    }
  };

  const handleViewSubstations = async (station: Station) => {
    try {
      const full = await api.getStation(station.id);
      setSelectedStation(full);
      setStationIdParam(station.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load station');
    }
  };

  const handleAddSubstation = () => {
    setEditingSubstation(null);
    setSubstationForm({
      number: '',
      marketing_name: '',
      major_network_id: null,
    });
    setShowSubstationModal(true);
  };

  const handleEditSubstation = (sub: Substation) => {
    setEditingSubstation(sub);
    setSubstationForm({
      number: sub.number,
      marketing_name: sub.marketing_name,
      major_network_id: sub.major_network_id ?? null,
    });
    setShowSubstationModal(true);
  };

  const handleSubmitSubstation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation) return;
    setSubmitting(true);

    try {
      const data = {
        station_id: selectedStation.id,
        number: substationForm.number as number,
        marketing_name: substationForm.marketing_name,
        major_network_id: substationForm.major_network_id ? (substationForm.major_network_id as number) : null,
      };

      if (editingSubstation) {
        await api.admin.updateSubstation(editingSubstation.id, data);
      } else {
        await api.admin.createSubstation(data);
      }

      const updated = await api.getStation(selectedStation.id);
      setSelectedStation(updated);
      setShowSubstationModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save substation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubstation = async (id: number) => {
    if (!confirm('Are you sure you want to delete this substation?')) return;
    if (!selectedStation) return;

    try {
      await api.admin.deleteSubstation(id);
      const updated = await api.getStation(selectedStation.id);
      setSelectedStation(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete substation');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Stations</h1>
        <button
          onClick={handleAddStation}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add Station
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b space-y-3">
            <h2 className="font-semibold">Stations</h2>
            <select
              value={filterTmaId}
              onChange={(e) => {
                setFilterTmaId(e.target.value);
                setSelectedStation(null);
              }}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="">All Markets ({stations.length} stations)</option>
              {tmas.map((tma) => {
                const count = stations.filter((s) => s.tma_id === tma.id).length;
                return (
                  <option key={tma.id} value={tma.id}>
                    {tma.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {filteredStations.length === 0 && (
              <p className="p-4 text-gray-500 text-center">No stations in this market</p>
            )}
            {filteredStations.map((station) => (
              <div
                key={station.id}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedStation?.id === station.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleViewSubstations(station)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">Ch. {station.station_number}</span>
                    <span className="text-gray-500 ml-2">{station.callsign}</span>
                    {station.station_group_id && (
                      <span className="ml-2 bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded">
                        {stationGroups.find((g: StationGroup) => g.id === station.station_group_id)?.name || 'Group'}
                      </span>
                    )}
                    <p className="text-sm text-gray-600">{station.marketing_name}</p>
                    <p className="text-xs text-gray-400">{station.tma_name}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditStation(station); }}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteStation(station.id); }}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${selectedStation ? 'block' : 'hidden lg:block'}`}>
          <div className="p-4 border-b flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {selectedStation && (
                <button
                  onClick={() => {
                    setSelectedStation(null);
                    setStationIdParam(null);
                  }}
                  className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
                  aria-label="Back to stations"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h2 className="font-semibold">
                {selectedStation ? `Substations for Ch. ${selectedStation.station_number}` : 'Select a station'}
              </h2>
            </div>
            {selectedStation && (
              <button
                onClick={handleAddSubstation}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                Add Substation
              </button>
            )}
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {selectedStation?.station_group_id && (
              <div className="p-3 bg-purple-50 text-purple-700 text-sm">
                Shared substations from: <strong>{stationGroups.find((g: StationGroup) => g.id === selectedStation.station_group_id)?.name}</strong>
              </div>
            )}
            {selectedStation?.substations.length === 0 && (
              <p className="p-4 text-gray-500 text-center">No substations</p>
            )}
            {selectedStation?.substations.map((sub) => (
              <div key={sub.id} className="p-4 flex justify-between items-center">
                <div>
                  <span className="font-medium">{selectedStation.station_number}.{sub.number}</span>
                  {sub.network_short_name && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded ml-2">
                      {sub.network_short_name}
                    </span>
                  )}
                  {sub.station_group_id && (
                    <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded ml-2">
                      Shared
                    </span>
                  )}
                  <p className="text-sm text-gray-600">{sub.marketing_name}</p>
                </div>
                <div className="flex space-x-2">
                  {!sub.station_group_id && (
                    <>
                      <button
                        onClick={() => handleEditSubstation(sub)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSubstation(sub.id)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Station Modal */}
      {showStationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingStation ? 'Edit Station' : 'Add Station'}
            </h2>
            <form onSubmit={handleSubmitStation}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Callsign</label>
                  <input
                    type="text"
                    value={stationForm.callsign}
                    onChange={(e) => setStationForm({ ...stationForm, callsign: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Channel Number</label>
                  <input
                    type="number"
                    value={stationForm.station_number}
                    onChange={(e) => setStationForm({ ...stationForm, station_number: e.target.value ? parseInt(e.target.value) : '' })}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marketing Name</label>
                  <input
                    type="text"
                    value={stationForm.marketing_name}
                    onChange={(e) => setStationForm({ ...stationForm, marketing_name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                  <input
                    type="url"
                    value={stationForm.logo_url}
                    onChange={(e) => setStationForm({ ...stationForm, logo_url: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TMA</label>
                  <select
                    value={stationForm.tma_id}
                    onChange={(e) => setStationForm({ ...stationForm, tma_id: e.target.value ? parseInt(e.target.value) : '' })}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select TMA</option>
                    {tmas.map((tma) => (
                      <option key={tma.id} value={tma.id}>{tma.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Station Group (optional)</label>
                  <select
                    value={stationForm.station_group_id || ''}
                    onChange={(e) => setStationForm({ ...stationForm, station_group_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">None</option>
                    {stationGroups.map((group: StationGroup) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Assign to a group to share substations with other transmitters
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowStationModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Substation Modal */}
      {showSubstationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingSubstation ? 'Edit Substation' : 'Add Substation'}
            </h2>
            <form onSubmit={handleSubmitSubstation}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subchannel Number (e.g., 1 for {selectedStation?.station_number}.1)
                  </label>
                  <input
                    type="number"
                    value={substationForm.number}
                    onChange={(e) => setSubstationForm({ ...substationForm, number: e.target.value ? parseInt(e.target.value) : '' })}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marketing Name</label>
                  <input
                    type="text"
                    value={substationForm.marketing_name}
                    onChange={(e) => setSubstationForm({ ...substationForm, marketing_name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Network Affiliate (optional)</label>
                  <NetworkPicker
                    networks={networks}
                    value={substationForm.major_network_id}
                    onChange={(id) => setSubstationForm({ ...substationForm, major_network_id: id })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowSubstationModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
