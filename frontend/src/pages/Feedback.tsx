import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Feedback as FeedbackType, TMA } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function Feedback() {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();

  const [tmas, setTmas] = useState<TMA[]>([]);
  const [selectedTmaId, setSelectedTmaId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [myFeedback, setMyFeedback] = useState<FeedbackType[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(true);

  // Filter to only show not_implemented TMAs
  const notImplementedTmas = useMemo(() => {
    return tmas.filter((tma) => tma.status === 'not_implemented');
  }, [tmas]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      sessionStorage.setItem('return_url', '/feedback');
      login();
    }
  }, [authLoading, isAuthenticated, login]);

  useEffect(() => {
    if (isAuthenticated) {
      Promise.all([api.getMyFeedback(), api.getTmas()])
        .then(([feedbackData, tmasData]) => {
          setMyFeedback(feedbackData);
          setTmas(tmasData);
        })
        .catch(() => {})
        .finally(() => setLoadingFeedback(false));
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const selectedTma = tmas.find((t) => t.id === parseInt(selectedTmaId, 10));
    if (!selectedTma) {
      setError('Please select a TMA');
      setSubmitting(false);
      return;
    }

    try {
      await api.submitFeedback({
        tma_name: selectedTma.name,
        description: description || undefined,
      });

      setSuccess(true);
      setSelectedTmaId('');
      setDescription('');

      // Refresh feedback list
      const updated = await api.getMyFeedback();
      setMyFeedback(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    );
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Request TMA Implementation
        </h1>
        <p className="text-gray-600">
          Request that we add station data for a Television Market Area
        </p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800">
            Thank you! Your request has been submitted and will be reviewed.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="mb-4">
          <label htmlFor="tmaSelect" className="block text-sm font-medium text-gray-700 mb-1">
            Select a Market *
          </label>
          {notImplementedTmas.length === 0 ? (
            <p className="text-gray-500 text-sm py-2">
              All markets have been implemented or are in progress!
            </p>
          ) : (
            <select
              id="tmaSelect"
              value={selectedTmaId}
              onChange={(e) => setSelectedTmaId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a market...</option>
              {notImplementedTmas.map((tma) => (
                <option key={tma.id} value={tma.id}>
                  {tma.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Why are you interested in this market? (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Help us prioritize by sharing why you need this market..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !selectedTmaId || notImplementedTmas.length === 0}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your Requests</h2>

        {loadingFeedback ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : myFeedback.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            You haven't submitted any requests yet.
          </p>
        ) : (
          <div className="space-y-3">
            {myFeedback.map((fb) => (
              <div key={fb.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{fb.tma_name}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[fb.status]}`}>
                    {fb.status.charAt(0).toUpperCase() + fb.status.slice(1)}
                  </span>
                </div>
                {fb.description && (
                  <p className="text-sm text-gray-600 mb-2">{fb.description}</p>
                )}
                <p className="text-xs text-gray-400">
                  Submitted {new Date(fb.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
