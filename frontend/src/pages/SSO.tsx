import { useEffect } from 'react';
import { startLogin } from '../lib/oauth';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function SSO() {
  useEffect(() => {
    startLogin();
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600">Redirecting to login...</p>
    </div>
  );
}
