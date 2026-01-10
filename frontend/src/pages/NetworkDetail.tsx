import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { NetworkWithAffiliates } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SearchInput } from '../components/SearchInput';

export function NetworkDetail() {
  const { id } = useParams<{ id: string }>();
  const [network, setNetwork] = useState<NetworkWithAffiliates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!id) return;

    api.getNetwork(parseInt(id, 10))
      .then(setNetwork)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const filteredAffiliates = useMemo(() => {
    if (!network) return [];
    if (!search) return network.affiliates;
    const searchLower = search.toLowerCase();
    return network.affiliates.filter(
      (aff) =>
        aff.station_callsign.toLowerCase().includes(searchLower) ||
        aff.station_marketing_name.toLowerCase().includes(searchLower) ||
        aff.marketing_name.toLowerCase().includes(searchLower) ||
        aff.tma_name.toLowerCase().includes(searchLower)
    );
  }, [network, search]);

  // Group affiliates by TMA for better organization
  const affiliatesByTma = useMemo(() => {
    const grouped: Record<string, typeof filteredAffiliates> = {};
    filteredAffiliates.forEach((aff) => {
      if (!grouped[aff.tma_name]) {
        grouped[aff.tma_name] = [];
      }
      grouped[aff.tma_name].push(aff);
    });
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredAffiliates]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !network) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Network not found'}</p>
        <Link to="/networks" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Networks
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/networks" className="text-blue-600 hover:underline text-sm flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Networks</span>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex items-center space-x-6">
          {network.logo_url ? (
            <img
              src={network.logo_url}
              alt={network.short_name}
              className="w-24 h-24 object-contain"
            />
          ) : (
            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-3xl font-bold text-gray-400">{network.short_name.charAt(0)}</span>
            </div>
          )}

          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {network.short_name}
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              {network.long_name}
            </p>
            <p className="text-sm text-gray-500">
              {network.affiliates.length} affiliate{network.affiliates.length !== 1 ? 's' : ''} nationwide
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Local Affiliates</h2>

        <div className="max-w-md mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search affiliates by station, callsign, or market..."
          />
        </div>
      </div>

      {filteredAffiliates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-gray-500">
            {search ? 'No affiliates found matching your search' : 'No affiliates registered for this network'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {affiliatesByTma.map(([tmaName, affiliates]) => (
            <div key={tmaName} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h3 className="font-semibold text-gray-700">{tmaName}</h3>
              </div>
              <div className="divide-y">
                {affiliates.map((affiliate) => (
                  <Link
                    key={affiliate.id}
                    to={`/stations/${affiliate.station_id}`}
                    className="flex items-center p-4 hover:bg-gray-50"
                  >
                    {affiliate.station_logo_url ? (
                      <img
                        src={affiliate.station_logo_url}
                        alt={affiliate.station_callsign}
                        className="w-10 h-10 object-contain mr-4"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center mr-4">
                        <span className="text-sm font-bold text-gray-400">
                          {affiliate.station_number}
                        </span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          Ch. {affiliate.station_number}.{affiliate.number}
                        </span>
                        <span className="text-gray-500">{affiliate.station_callsign}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {affiliate.marketing_name}
                      </p>
                    </div>

                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
