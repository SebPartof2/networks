import { useState, useMemo } from 'react';
import { MajorNetwork } from '../types';

interface NetworkPickerProps {
  networks: MajorNetwork[];
  value: number | null;
  onChange: (networkId: number | null) => void;
}

export function NetworkPicker({ networks, value, onChange }: NetworkPickerProps) {
  const [search, setSearch] = useState('');

  const selectedNetwork = useMemo(() => {
    return networks.find((n) => n.id === value) || null;
  }, [networks, value]);

  const filteredNetworks = useMemo(() => {
    if (!search) return networks;
    const searchLower = search.toLowerCase();
    return networks.filter(
      (n) =>
        n.short_name.toLowerCase().includes(searchLower) ||
        n.long_name.toLowerCase().includes(searchLower)
    );
  }, [networks, search]);

  return (
    <div className="space-y-3">
      {/* Selected network display */}
      {selectedNetwork && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-3">
            {selectedNetwork.logo_url ? (
              <img
                src={selectedNetwork.logo_url}
                alt={selectedNetwork.short_name}
                className="w-10 h-10 object-contain"
              />
            ) : (
              <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600">
                  {selectedNetwork.short_name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium text-blue-900">{selectedNetwork.short_name}</p>
              <p className="text-sm text-blue-700">{selectedNetwork.long_name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-blue-600 hover:text-blue-800 p-1"
            aria-label="Clear selection"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Search input */}
      <div className="relative">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
        {/* None option */}
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`p-2 rounded-lg border text-left transition-colors ${
            value === null
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <span className="text-sm text-gray-600">None</span>
          </div>
        </button>

        {filteredNetworks.map((network) => (
          <button
            key={network.id}
            type="button"
            onClick={() => onChange(network.id)}
            className={`p-2 rounded-lg border text-left transition-colors ${
              value === network.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2">
              {network.logo_url ? (
                <img
                  src={network.logo_url}
                  alt={network.short_name}
                  className="w-8 h-8 object-contain flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-gray-400">
                    {network.short_name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{network.short_name}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {filteredNetworks.length === 0 && search && (
        <p className="text-sm text-gray-500 text-center py-2">
          No networks found matching "{search}"
        </p>
      )}
    </div>
  );
}
