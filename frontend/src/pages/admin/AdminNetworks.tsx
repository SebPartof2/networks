import { useState, useEffect } from 'react';
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

      <div className="bg-white rounded-lg shadow-sm overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Short Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Long Name</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {networks.map((network) => (
              <tr key={network.id}>
                <td className="px-6 py-4">
                  {network.logo_url ? (
                    <img src={network.logo_url} alt={network.short_name} className="w-10 h-10 object-contain" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-xs text-gray-400">{network.short_name}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">{network.short_name}</td>
                <td className="px-6 py-4 text-gray-600">{network.long_name}</td>
                <td className="px-6 py-4 text-right space-x-3">
                  <button
                    onClick={() => handleEdit(network)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(network.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {networks.length === 0 && (
          <p className="text-center py-8 text-gray-500">No networks found</p>
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
