import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Station } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StationCard } from '../components/StationCard';
import { SearchInput } from '../components/SearchInput';

export function Stations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const loadStations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.searchStations(debouncedSearch || undefined);
      setStations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stations');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          All Stations
        </h1>
        <p className="text-gray-600">
          Search across all available TV stations
        </p>
      </div>

      <div className="mb-6 max-w-md">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by callsign, name, or channel..."
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">Error: {error}</p>
          <button
            onClick={loadStations}
            className="text-blue-600 hover:underline mt-4"
          >
            Try again
          </button>
        </div>
      ) : stations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {debouncedSearch ? 'No stations found matching your search' : 'No stations available'}
          </p>
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
