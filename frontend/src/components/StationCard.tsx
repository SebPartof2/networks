import { Link } from 'react-router-dom';
import { Station } from '../types';

interface StationCardProps {
  station: Station;
}

export function StationCard({ station }: StationCardProps) {
  return (
    <Link
      to={`/stations/${station.id}`}
      className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4"
    >
      <div className="flex items-center space-x-4">
        {station.logo_url ? (
          <img
            src={station.logo_url}
            alt={station.marketing_name}
            className="w-16 h-16 object-contain rounded"
          />
        ) : (
          <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-400">{station.station_number}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-blue-600">
              Ch. {station.station_number}
            </span>
            <span className="text-sm text-gray-500">{station.callsign}</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 truncate">
            {station.marketing_name}
          </h3>
          <p className="text-sm text-gray-500">{station.tma_name}</p>
        </div>

        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
