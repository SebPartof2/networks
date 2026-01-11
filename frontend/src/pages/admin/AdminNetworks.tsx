import { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { MajorNetwork } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';

interface NetworkFormData {
  short_name: string;
  long_name: string;
  logo_url: string;
}

export function AdminNetworks() {
  const [networks, setNetworks] = useState<MajorNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MajorNetwork | null>(null);
  const [formData, setFormData] = useState<NetworkFormData>({
    short_name: '',
    long_name: '',
    logo_url: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getNetworks()
      .then(setNetworks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredNetworks = useMemo(() => {
    if (!search) return networks;
    const searchLower = search.toLowerCase();
    return networks.filter(
      (n) =>
        n.short_name.toLowerCase().includes(searchLower) ||
        n.long_name.toLowerCase().includes(searchLower)
    );
  }, [networks, search]);

  const handleAdd = () => {
    setEditing(null);
    setFormData({ short_name: '', long_name: '', logo_url: '' });
    setShowModal(true);
  };

  const handleEdit = (network: MajorNetwork) => {
    setEditing(network);
    setFormData({
      short_name: network.short_name,
      long_name: network.long_name,
      logo_url: network.logo_url || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = {
        short_name: formData.short_name,
        long_name: formData.long_name,
        logo_url: formData.logo_url || undefined,
      };

      if (editing) {
        await api.admin.updateNetwork(editing.id, data);
      } else {
        await api.admin.createNetwork(data);
      }

      const updated = await api.getNetworks();
      setNetworks(updated);
      setShowModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save network');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this network?')) return;

    try {
      await api.admin.deleteNetwork(id);
      setNetworks(networks.filter((n) => n.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete network');
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
        <h1 className="text-2xl font-bold text-gray-900">Manage Networks</h1>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add Network
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        {/* Search input */}
        <div className="relative mb-4">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search networks..."
            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm"
          />
        </div>

        {/* Network grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredNetworks.map((network) => (
            <div
              key={network.id}
              className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col items-center text-center">
                {network.logo_url ? (
                  <img
                    src={network.logo_url}
                    alt={network.short_name}
                    className="w-12 h-12 object-contain mb-2"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center mb-2">
                    <span className="text-sm font-bold text-gray-400">
                      {network.short_name.charAt(0)}
                    </span>
                  </div>
                )}
                <p className="text-sm font-medium text-gray-900 truncate w-full">
                  {network.short_name}
                </p>
                <p className="text-xs text-gray-500 truncate w-full mb-2">
                  {network.long_name}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(network)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(network.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredNetworks.length === 0 && (
          <p className="text-center py-8 text-gray-500">
            {search ? `No networks found matching "${search}"` : 'No networks found'}
          </p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editing ? 'Edit Network' : 'Add Network'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Short Name</label>
                  <input
                    type="text"
                    value={formData.short_name}
                    onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                    required
                    placeholder="e.g., NBC"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Long Name</label>
                  <input
                    type="text"
                    value={formData.long_name}
                    onChange={(e) => setFormData({ ...formData, long_name: e.target.value })}
                    required
                    placeholder="e.g., National Broadcasting Company"
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
    </div>
  );
}
