import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.admin.getUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleAdmin = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert("You can't remove your own admin status");
      return;
    }

    const newStatus = !user.is_admin;
    const action = newStatus ? 'grant admin access to' : 'remove admin access from';
    if (!confirm(`Are you sure you want to ${action} ${user.email}?`)) return;

    try {
      await api.admin.updateUser(user.id, { is_admin: newStatus });
      setUsers(users.map((u) => (u.id === user.id ? { ...u, is_admin: newStatus } : u)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
        <p className="text-gray-600">View and manage user accounts and admin permissions</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.given_name} {user.family_name}
                      {user.id === currentUser?.id && (
                        <span className="ml-2 text-xs text-blue-600">(You)</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 font-mono">{user.id}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  {user.is_admin ? (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Admin</span>
                  ) : (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">User</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleToggleAdmin(user)}
                    disabled={user.id === currentUser?.id}
                    className={`text-sm ${
                      user.id === currentUser?.id
                        ? 'text-gray-400 cursor-not-allowed'
                        : user.is_admin
                        ? 'text-red-600 hover:underline'
                        : 'text-blue-600 hover:underline'
                    }`}
                  >
                    {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <p className="text-center py-8 text-gray-500">No users found</p>
        )}
      </div>
    </div>
  );
}
