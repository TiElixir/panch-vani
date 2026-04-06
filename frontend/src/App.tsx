import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'

// Pages
import LoginPage from './pages/LoginPage'
import AuthSuccessPage from './pages/AuthSuccessPage'
import DashboardPage from './pages/DashboardPage'
import HubPage from './pages/HubPage'
import PollPage from './pages/PollPage'
import HubAdminPage from './pages/HubAdminPage'
import PlatformAdminPage from './pages/PlatformAdminPage'

import type { ReactNode } from 'react'

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_super_admin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/success" element={<AuthSuccessPage />} />

        {/* Protected general routes */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/hubs/:hubId"
          element={
            <PrivateRoute>
              <HubPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/hubs/:hubId/polls/:pollId"
          element={
            <PrivateRoute>
              <PollPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/hubs/:hubId/admin"
          element={
            <PrivateRoute>
              <HubAdminPage />
            </PrivateRoute>
          }
        />

        {/* Super admin routes */}
        <Route
          path="/platform-admin"
          element={
            <SuperAdminRoute>
              <PlatformAdminPage />
            </SuperAdminRoute>
          }
        />
      </Routes>
    </>
  )
}
