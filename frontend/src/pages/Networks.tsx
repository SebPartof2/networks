import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { MajorNetwork } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SearchInput } from '../components/SearchInput';

type SortOption = 'name' | 'affiliates';

export function Networks() {
  const [networks, setNetworks] = useState<MajorNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');

  useEffect(() => {
    api.getNetworks()
      .then(setNetworks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredNetworks = useMemo(() => {
    let result = networks;

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (net) =>
          net.short_name.toLowerCase().includes(searchLower) ||
          net.long_name.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    if (sortBy === 'affiliates') {
      result = [...result].sort((a, b) => (b.affiliate_count || 0) - (a.affiliate_count || 0));
    } else {
      result = [...result].sort((a, b) => a.short_name.localeCompare(b.short_name));
    }

    return result;
  }, [networks, search, sortBy]);

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
        <p className="text-red-600">Error loading networks: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Major Networks
        </h1>
        <p className="text-gray-600">
          Browse major broadcast networks and their local affiliates
        </p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="max-w-md flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search networks..."
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-3 py-2 border rounded-md text-sm bg-white"
        >
          <option value="name">Sort by Name</option>
          <option value="affiliates">Sort by Affiliates</option>
        </select>
      </div>

      {filteredNetworks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {search ? 'No networks found matching your search' : 'No networks available'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredNetworks.map((network) => (
            <Link
              key={network.id}
              to={`/networks/${network.id}`}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 flex items-center space-x-4"
            >
              {network.logo_url ? (
                <img
                  src={network.logo_url}
                  alt={network.short_name}
                  className="w-12 h-12 object-contain flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-gray-400">
                    {network.short_name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900">{network.short_name}</p>
                <p className="text-sm text-gray-500 truncate">{network.long_name}</p>
              </div>
              {network.affiliate_count !== undefined && network.affiliate_count > 0 && (
                <div className="flex flex-col items-center flex-shrink-0">
                  <span className="text-2xl font-bold text-blue-600">{network.affiliate_count}</span>
                  <span className="text-xs text-gray-500">affiliates</span>
                </div>
              )}
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
