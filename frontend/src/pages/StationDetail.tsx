import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { StationWithSubstations } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SubstationCard } from '../components/SubstationCard';

export function StationDetail() {
  const { id } = useParams<{ id: string }>();
  const [station, setStation] = useState<StationWithSubstations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    api.getStation(parseInt(id, 10))
      .then(setStation)
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

  if (error || !station) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Station not found'}</p>
        <Link to="/stations" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Stations
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/stations" className="text-blue-600 hover:underline text-sm flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Stations</span>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
          {station.logo_url ? (
            <img
              src={station.logo_url}
              alt={station.marketing_name}
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-lg flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-2xl sm:text-3xl font-bold text-gray-400">{station.station_number}</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <span className="text-xl sm:text-2xl font-bold text-blue-600">
                Channel {station.station_number}
              </span>
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                {station.callsign}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {station.marketing_name}
            </h1>

            <p className="text-gray-600">
              <Link to={`/tma/${station.tma_id}`} className="hover:underline">
                {station.tma_name}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {station.substations.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Subchannels
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {station.substations.map((substation) => (
              <SubstationCard
                key={substation.id}
                substation={substation}
                parentStationNumber={station.station_number}
                parentLogoUrl={station.logo_url}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
