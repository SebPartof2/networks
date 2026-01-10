import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { TMAStations } from './pages/TMAStations';
import { Stations } from './pages/Stations';
import { StationDetail } from './pages/StationDetail';
import { Feedback } from './pages/Feedback';
import { SSO } from './pages/SSO';
import { Callback } from './pages/Callback';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminStations } from './pages/admin/AdminStations';
import { AdminNetworks } from './pages/admin/AdminNetworks';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminFeedback } from './pages/admin/AdminFeedback';

function App() {
  return (
    <Layout>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/tma/:id" element={<TMAStations />} />
        <Route path="/stations" element={<Stations />} />
        <Route path="/stations/:id" element={<StationDetail />} />

        {/* Auth routes */}
        <Route path="/sso" element={<SSO />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/feedback" element={<Feedback />} />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/stations"
          element={
            <AdminLayout>
              <AdminStations />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/networks"
          element={
            <AdminLayout>
              <AdminNetworks />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminLayout>
              <AdminUsers />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/feedback"
          element={
            <AdminLayout>
              <AdminFeedback />
            </AdminLayout>
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="text-center py-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
              <p className="text-gray-600">Page not found</p>
            </div>
          }
        />
      </Routes>
    </Layout>
  );
}

export default App;
