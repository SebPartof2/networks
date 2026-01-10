import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { TMA, Station } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StationCard } from '../components/StationCard';

export function TMAStations() {
  const { id } = useParams<{ id: string }>();
  const [tma, setTma] = useState<TMA | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    api.getTmaStations(parseInt(id, 10))
      .then((data) => {
        setTma(data.tma);
        setStations(data.stations);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading stations: {error}</p>
        <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Markets
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="text-blue-600 hover:underline text-sm flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Markets</span>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {tma?.name}
        </h1>
        <p className="text-gray-600">
          {stations.length} station{stations.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {stations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No stations available in this market</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stations.map((station) => (
            <StationCard key={station.id} station={station} />
          ))}
        </div>
      )}
    </div>
  );
}
