import { Link } from 'react-router-dom';
import { Substation } from '../types';

interface SubstationCardProps {
  substation: Substation;
  parentStationNumber: number;
  parentLogoUrl: string | null;
}

export function SubstationCard({ substation, parentStationNumber, parentLogoUrl }: SubstationCardProps) {
  // Use network logo if available, otherwise use parent station logo
  const logoUrl = substation.network_logo_url || parentLogoUrl;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center space-x-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={substation.marketing_name}
            className="w-12 h-12 object-contain rounded"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-sm font-bold text-gray-400">
              {parentStationNumber}.{substation.number}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-blue-600">
              {parentStationNumber}.{substation.number}
            </span>
            {substation.network_short_name && substation.major_network_id && (
              <Link
                to={`/networks/${substation.major_network_id}`}
                className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded hover:bg-blue-200 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {substation.network_short_name}
              </Link>
            )}
          </div>
          <h4 className="font-medium text-gray-900 truncate">
            {substation.marketing_name}
          </h4>
        </div>
      </div>
    </div>
  );
}
