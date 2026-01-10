import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { TMA, TMAStatus } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { SearchInput } from '../../components/SearchInput';

export function AdminTMAs() {
  const [tmas, setTmas] = useState<TMA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    api.getTmas()
      .then(setTmas)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (tma: TMA, newStatus: TMAStatus) => {
    setUpdating(tma.id);
    try {
      await api.admin.updateTMAStatus(tma.id, newStatus);
      setTmas(tmas.map((t) => (t.id === tma.id ? { ...t, status: newStatus } : t)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const filteredTmas = search
    ? tmas.filter((tma) => tma.name.toLowerCase().includes(search.toLowerCase()))
    : tmas;

  const statusCounts = {
    complete: tmas.filter((t) => t.status === 'complete').length,
    in_progress: tmas.filter((t) => t.status === 'in_progress').length,
    not_implemented: tmas.filter((t) => t.status === 'not_implemented').length,
  };

  const statusColors: Record<TMAStatus, string> = {
    complete: 'bg-green-100 text-green-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    not_implemented: 'bg-gray-100 text-gray-600',
  };

  const statusLabels: Record<TMAStatus, string> = {
    complete: 'Complete',
    in_progress: 'In Progress',
    not_implemented: 'Not Implemented',
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage TMAs</h1>
        <p className="text-gray-600">Update the implementation status of Television Market Areas</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-2xl font-bold text-green-700">{statusCounts.complete}</p>
          <p className="text-sm text-green-600">Complete</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-2xl font-bold text-yellow-700">{statusCounts.in_progress}</p>
          <p className="text-sm text-yellow-600">In Progress</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-2xl font-bold text-gray-700">{statusCounts.not_implemented}</p>
          <p className="text-sm text-gray-600">Not Implemented</p>
        </div>
      </div>

      <div className="mb-4 max-w-md">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search markets..."
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Market Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Change Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTmas.map((tma) => (
              <tr key={tma.id} className={updating === tma.id ? 'opacity-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900">{tma.name}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[tma.status]}`}>
                    {statusLabels[tma.status]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={tma.status}
                    onChange={(e) => handleStatusChange(tma, e.target.value as TMAStatus)}
                    disabled={updating === tma.id}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value="not_implemented">Not Implemented</option>
                    <option value="in_progress">In Progress</option>
                    <option value="complete">Complete</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
