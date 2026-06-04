import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AssetsPage from './pages/AssetsPage';
import AssetDetailPage from './pages/AssetDetailPage';
import AddAssetPage from './pages/AddAssetPage';
import TransfersPage from './pages/TransfersPage';
import TransferDetailPage from './pages/TransferDetailPage';
import NewTransferPage from './pages/NewTransferPage';
import MaintenancePage from './pages/MaintenancePage';
import DisposalsPage from './pages/DisposalsPage';
import AuditPage from './pages/AuditPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import SettingsPage from './pages/SettingsPage';
import ApprovalsPage from './pages/ApprovalsPage';
import { useAuth } from './contexts/AuthContext';

function StartupRoute() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="center-screen" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p className="center-screen-text">Loading AssetTrack...</p>
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<StartupRoute />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/dashboard"        element={<DashboardPage />} />
                    <Route path="/assets"           element={<AssetsPage />} />
                    <Route path="/assets/new"       element={<AddAssetPage />} />
                    <Route path="/assets/:id"       element={<AssetDetailPage />} />
                    <Route path="/assets/:id/edit"  element={<AddAssetPage />} />
                    <Route path="/transfers"        element={<TransfersPage />} />
                    <Route path="/transfers/new"    element={<NewTransferPage />} />
                    <Route path="/transfers/:id"    element={<TransferDetailPage />} />
                    <Route path="/maintenance"      element={<MaintenancePage />} />
                    <Route path="/disposals"        element={<DisposalsPage />} />
                    <Route path="/approvals"        element={<ProtectedRoute requiredRoles={['ADMIN', 'MANAGER']}><ApprovalsPage /></ProtectedRoute>} />
                    <Route path="/audit"            element={<AuditPage />} />
                    <Route path="/reports"          element={<ReportsPage />} />
                    <Route path="/users"            element={<UsersPage />} />
                    <Route path="/roles"            element={<RolesPage />} />
                    <Route path="/settings"         element={<SettingsPage />} />
                    <Route path="*"                 element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
