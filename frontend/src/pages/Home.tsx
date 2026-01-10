import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { TMA } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SearchInput } from '../components/SearchInput';

export function Home() {
  const [tmas, setTmas] = useState<TMA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getTmas()
      .then(setTmas)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredTmas = useMemo(() => {
    if (!search) return tmas;
    const searchLower = search.toLowerCase();
    return tmas.filter((tma) => tma.name.toLowerCase().includes(searchLower));
  }, [tmas, search]);

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
        <p className="text-red-600">Error loading TMAs: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Browse TV Stations by Market
        </h1>
        <p className="text-gray-600">
          Select a Television Market Area (TMA) to view available stations
        </p>
      </div>

      <div className="mb-6 max-w-md">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search markets..."
        />
      </div>

      {filteredTmas.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {search ? 'No markets found matching your search' : 'No markets available'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTmas.map((tma) => (
            <Link
              key={tma.id}
              to={`/tma/${tma.id}`}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 flex items-center justify-between"
            >
              <span className="font-medium text-gray-900">{tma.name}</span>
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
