import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Register from './pages/Register'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'

function AppRoutes() {
  const { isAuth } = useAuth()

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/register" element={!isAuth ? <Register /> : <Navigate to="/dashboard" replace />} />
      <Route path="/login"    element={!isAuth ? <Login />    : <Navigate to="/dashboard" replace />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />

      {/* Default redirect */}
      <Route path="/"   element={<Navigate to={isAuth ? "/dashboard" : "/login"} replace />} />
      <Route path="*"   element={<Navigate to={isAuth ? "/dashboard" : "/login"} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
