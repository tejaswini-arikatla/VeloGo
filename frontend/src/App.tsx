import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { CustomerBookingPage } from './pages/CustomerBookingPage';
import { CustomerDashboardPage } from './pages/CustomerDashboardPage';
import { CaptainDashboardPage } from './pages/CaptainDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LoginPage, CustomerRegisterPage, CaptainRegisterPage } from './pages/AuthPages';
import { SafetyPage } from './pages/SafetyPage';
import { CorporateDashboardPage } from './pages/CorporateDashboardPage';
import { SubscriptionPlansPage } from './pages/SubscriptionPlansPage';
import { MoreFeaturesPage } from './pages/MoreFeaturesPage';
import { FeatureSuitePage } from './features/FeatureSuitePage';
import { ErrorBoundary } from './components/ErrorBoundary';

const queryClient = new QueryClient();

// Protected Route Guard
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs font-bold text-slate-400">
        Authenticating VeloGo session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-brand-500 selection:text-slate-950">
              <Navbar />
              <main className="flex-1">
                <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/book" element={<CustomerBookingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<CustomerRegisterPage />} />
                    <Route path="/captain/register" element={<CaptainRegisterPage />} />
                    <Route path="/safety" element={<SafetyPage />} />
                    <Route
                      path="/customer/features"
                      element={
                        <ProtectedRoute allowedRoles={['ROLE_CUSTOMER', 'ROLE_ADMIN']}>
                          <MoreFeaturesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/customer/feature-suite"
                      element={
                        <ProtectedRoute allowedRoles={['ROLE_CUSTOMER', 'ROLE_ADMIN']}>
                          <FeatureSuitePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/subscriptions" element={<SubscriptionPlansPage />} />
                    <Route
                      path="/corporate"
                      element={
                        <ProtectedRoute allowedRoles={['ROLE_CUSTOMER', 'ROLE_ADMIN']}>
                          <CorporateDashboardPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Customer Routes */}
                    <Route
                      path="/customer/dashboard"
                      element={
                        <ProtectedRoute allowedRoles={['ROLE_CUSTOMER', 'ROLE_ADMIN']}>
                          <CustomerDashboardPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/customer/history"
                      element={
                        <ProtectedRoute allowedRoles={['ROLE_CUSTOMER', 'ROLE_ADMIN']}>
                          <CustomerDashboardPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Captain Routes */}
                    <Route
                      path="/captain/dashboard"
                      element={
                        <ProtectedRoute allowedRoles={['ROLE_CAPTAIN', 'ROLE_ADMIN']}>
                          <CaptainDashboardPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Admin Routes */}
                    <Route
                      path="/admin/dashboard"
                      element={
                        <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
                          <AdminDashboardPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </ErrorBoundary>
              </main>
            </div>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
