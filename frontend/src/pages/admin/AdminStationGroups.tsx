import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { StationGroup, StationGroupWithDetails, MajorNetwork, Substation } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { NetworkPicker } from '../../components/NetworkPicker';

interface GroupFormData {
  name: string;
  logo_url: string;
}

interface SubstationFormData {
  number: number | '';
  marketing_name: string;
  major_network_id: number | null;
}

export function AdminStationGroups() {
  const [groups, setGroups] = useState<StationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StationGroup | null>(null);
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    logo_url: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Detail view state
  const [selectedGroup, setSelectedGroup] = useState<StationGroupWithDetails | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Substation form state
  const [showSubstationModal, setShowSubstationModal] = useState(false);
  const [editingSubstation, setEditingSubstation] = useState<Substation | null>(null);
  const [substationFormData, setSubstationFormData] = useState<SubstationFormData>({
    number: '',
    marketing_name: '',
    major_network_id: null,
  });
  const [networks, setNetworks] = useState<MajorNetwork[]>([]);

  useEffect(() => {
    Promise.all([
      api.admin.getStationGroups(),
      api.getNetworks(),
    ])
      .then(([groupsData, networksData]) => {
        setGroups(groupsData);
        setNetworks(networksData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = () => {
    setEditing(null);
    setFormData({ name: '', logo_url: '' });
    setShowModal(true);
  };

  const handleEdit = (group: StationGroup) => {
    setEditing(group);
    setFormData({
      name: group.name,
      logo_url: group.logo_url || '',
    });
    setShowModal(true);
  };

  const handleViewDetails = async (group: StationGroup) => {
    setLoadingDetail(true);
    try {
      const details = await api.admin.getStationGroup(group.id);
      setSelectedGroup(details);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load group details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = {
        name: formData.name,
        logo_url: formData.logo_url || undefined,
      };

      if (editing) {
        await api.admin.updateStationGroup(editing.id, data);
      } else {
        await api.admin.createStationGroup(data);
      }

      const updated = await api.admin.getStationGroups();
      setGroups(updated);
      setShowModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save station group');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this station group?')) return;

    try {
      await api.admin.deleteStationGroup(id);
      setGroups(groups.filter((g) => g.id !== id));
      if (selectedGroup?.id === id) {
        setSelectedGroup(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete station group');
    }
  };

  const handleAddSubstation = () => {
    setEditingSubstation(null);
    setSubstationFormData({
      number: '',
      marketing_name: '',
      major_network_id: null,
    });
    setShowSubstationModal(true);
  };

  const handleEditSubstation = (sub: Substation) => {
    setEditingSubstation(sub);
    setSubstationFormData({
      number: sub.number,
      marketing_name: sub.marketing_name,
      major_network_id: sub.major_network_id ?? null,
    });
    setShowSubstationModal(true);
  };

  const handleSubmitSubstation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    setSubmitting(true);
    try {
      const data = {
        station_group_id: selectedGroup.id,
        number: substationFormData.number as number,
        marketing_name: substationFormData.marketing_name,
        major_network_id: substationFormData.major_network_id,
      };

      if (editingSubstation) {
        await api.admin.updateSubstation(editingSubstation.id, data);
      } else {
        await api.admin.createSubstation(data);
      }

      // Refresh group details
      const updated = await api.admin.getStationGroup(selectedGroup.id);
      setSelectedGroup(updated);
      setShowSubstationModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save substation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubstation = async (substationId: number) => {
    if (!confirm('Are you sure you want to delete this substation?')) return;
    if (!selectedGroup) return;

    try {
      await api.admin.deleteSubstation(substationId);
      const updated = await api.admin.getStationGroup(selectedGroup.id);
      setSelectedGroup(updated);
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
        <h1 className="text-2xl font-bold text-gray-900">Manage Station Groups</h1>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add Station Group
        </button>
      </div>

      <p className="text-gray-600 text-sm mb-4">
        Station groups allow multiple transmitters (like PBS affiliates across a state) to share the same substations.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Groups List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-700">Station Groups</h2>
          </div>
          <div className="divide-y">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedGroup?.id === group.id ? 'bg-blue-50' : ''}`}
                onClick={() => handleViewDetails(group)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {group.logo_url ? (
                      <img src={group.logo_url} alt={group.name} className="w-10 h-10 object-contain" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-xs text-gray-400">{group.name.substring(0, 2)}</span>
                      </div>
                    )}
                    <span className="font-medium text-gray-900">{group.name}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(group);
                      }}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(group.id);
                      }}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {groups.length === 0 && (
              <p className="text-center py-8 text-gray-500">No station groups found</p>
            )}
          </div>
        </div>

        {/* Group Details */}
        <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${selectedGroup ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-gray-50 px-4 py-3 border-b">
            <div className="flex items-center space-x-2">
              {selectedGroup && (
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
                  aria-label="Back to groups"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h2 className="font-semibold text-gray-700">
                {selectedGroup ? selectedGroup.name : 'Select a group'}
              </h2>
            </div>
          </div>

          {loadingDetail ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : selectedGroup ? (
            <div className="p-4">
              {/* Stations in group */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-2">
                  Stations ({selectedGroup.stations.length})
                </h3>
                {selectedGroup.stations.length > 0 ? (
                  <div className="space-y-2">
                    {selectedGroup.stations.map((station) => (
                      <Link
                        key={station.id}
                        to={`/admin/stations?tma=${station.tma_id}`}
                        className="block p-2 bg-gray-50 rounded hover:bg-gray-100"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{station.callsign}</span>
                          <span className="text-sm text-gray-500">{station.tma_name}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Ch. {station.station_number} - {station.marketing_name}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No stations assigned to this group yet. Assign stations via the Manage Stations page.
                  </p>
                )}
              </div>

              {/* Shared Substations */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-gray-900">
                    Shared Substations ({selectedGroup.substations.length})
                  </h3>
                  <button
                    onClick={handleAddSubstation}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Add Substation
                  </button>
                </div>
                {selectedGroup.substations.length > 0 ? (
                  <div className="space-y-2">
                    {selectedGroup.substations.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-2 bg-gray-50 rounded flex justify-between items-center"
                      >
                        <div>
                          <span className="font-medium">X.{sub.number}</span>
                          <span className="text-gray-600 ml-2">{sub.marketing_name}</span>
                          {sub.network_short_name && (
                            <span className="ml-2 text-sm text-blue-600">({sub.network_short_name})</span>
                          )}
                        </div>
                        <div className="flex space-x-2">
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
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No substations added yet. Add substations that will be shared across all stations in this group.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center py-12 text-gray-500">
              Select a station group to view details
            </p>
          )}
        </div>
      </div>

      {/* Station Group Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editing ? 'Edit Station Group' : 'Add Station Group'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Iowa PBS"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                  <input
                    type="url"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
              {editingSubstation ? 'Edit Shared Substation' : 'Add Shared Substation'}
            </h2>
            <form onSubmit={handleSubmitSubstation}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Substation Number (X.?)
                  </label>
                  <input
                    type="number"
                    value={substationFormData.number}
                    onChange={(e) =>
                      setSubstationFormData({ ...substationFormData, number: e.target.value === '' ? '' : parseInt(e.target.value) })
                    }
                    required
                    min="1"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marketing Name</label>
                  <input
                    type="text"
                    value={substationFormData.marketing_name}
                    onChange={(e) =>
                      setSubstationFormData({ ...substationFormData, marketing_name: e.target.value })
                    }
                    required
                    placeholder="e.g., {CALL}-DT or PBS HD"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use <code className="bg-gray-100 px-1">{'{CALL}'}</code> for full callsign or <code className="bg-gray-100 px-1">{'{CALL4}'}</code> for first 4 characters.
                    <br />
                    Example: <code className="bg-gray-100 px-1">{'{CALL}'}-DT</code> becomes <code className="bg-gray-100 px-1">KTVH-DT</code> for station KTVH
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Major Network (optional)
                  </label>
                  <NetworkPicker
                    networks={networks}
                    value={substationFormData.major_network_id}
                    onChange={(id) =>
                      setSubstationFormData({
                        ...substationFormData,
                        major_network_id: id,
                      })
                    }
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
                  {submitting ? 'Saving...' : editingSubstation ? 'Save Changes' : 'Add Substation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
