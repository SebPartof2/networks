import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { FeedbackWithUser } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export function AdminFeedback() {
  const [feedback, setFeedback] = useState<FeedbackWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getFeedback(filter || undefined);
      setFeedback(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, [filter]);

  const handleStatusChange = async (id: number, status: 'pending' | 'approved' | 'rejected') => {
    try {
      await api.admin.updateFeedback(id, { status });
      setFeedback(feedback.map((fb) => (fb.id === id ? { ...fb, status } : fb)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Feedback</h1>
          <p className="text-gray-600">Review and respond to TMA addition requests</p>
        </div>

        <div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : feedback.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-500">No feedback found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedback.map((fb) => (
            <div key={fb.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{fb.tma_name}</h3>
                  <p className="text-sm text-gray-500">
                    Requested by {fb.user_given_name} {fb.user_family_name} ({fb.user_email})
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(fb.created_at).toLocaleString()}
                  </p>
                </div>

                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[fb.status]}`}>
                  {fb.status.charAt(0).toUpperCase() + fb.status.slice(1)}
                </span>
              </div>

              {fb.description && (
                <p className="text-gray-600 mb-4">{fb.description}</p>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => handleStatusChange(fb.id, 'approved')}
                  disabled={fb.status === 'approved'}
                  className={`px-3 py-1 rounded text-sm ${
                    fb.status === 'approved'
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  Approve
                </button>
                <button
                  onClick={() => handleStatusChange(fb.id, 'rejected')}
                  disabled={fb.status === 'rejected'}
                  className={`px-3 py-1 rounded text-sm ${
                    fb.status === 'rejected'
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  Reject
                </button>
                {fb.status !== 'pending' && (
                  <button
                    onClick={() => handleStatusChange(fb.id, 'pending')}
                    className="px-3 py-1 rounded text-sm bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                  >
                    Reset to Pending
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
