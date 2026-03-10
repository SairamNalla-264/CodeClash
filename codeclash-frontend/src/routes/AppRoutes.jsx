import { Routes, Route } from 'react-router-dom'

// Public pages
import Landing from '../pages/public/Landing'
import About from '../pages/public/About'
import Features from '../pages/public/Features'

// Auth pages
import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'

// Protected pages
import DashboardHome from '../pages/dashboard/DashboardHome'
import Matchmaking from '../pages/dashboard/Matchmaking'
import Profile from '../pages/profile/Profile'

// Route protection
import ProtectedRoute from './ProtectedRoute'
import AdminDashboard from '../pages/admin/AdminDashboard'
import ManageUsers from '../pages/admin/ManageUsers'
import ManageProblems from '../pages/admin/ManageProblems'
import ArenaOversight from '../pages/admin/ArenaOversight'
import PlatformAnalytics from '../pages/admin/PlatformAnalytics'
import PracticeProblems from '../pages/practice/PracticeProblems'
import ProblemDetails from '../pages/problems/ProblemDetails'
import BattleRoom from '../pages/problems/BattleRoom'
import MySubmissions from '../pages/profile/MySubmissions'
import Leaderboard from '../pages/public/Leaderboard'

const AppRoutes = () => {
  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/features" element={<Features />} />
      <Route path="/leaderboard" element={<Leaderboard />} />

      {/* AUTH ROUTES */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* PROTECTED ROUTES */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardHome />
          </ProtectedRoute>
        }
      />

      <Route
        path="/matchmaking"
        element={
          <ProtectedRoute>
            <Matchmaking />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/submissions"
        element={
          <ProtectedRoute>
            <MySubmissions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <ManageUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/problems"
        element={
          <ProtectedRoute>
            <ManageProblems />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/battles"
        element={
          <ProtectedRoute>
            <ArenaOversight />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute>
            <PlatformAnalytics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/practice"
        element={
          <ProtectedRoute>
            <PracticeProblems />
          </ProtectedRoute>
        }
      />

      <Route
        path="/problems/:id"
        element={
          <ProtectedRoute>
            <ProblemDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/battle/:id"
        element={
          <ProtectedRoute>
            <BattleRoom />
          </ProtectedRoute>
        }
      />
    </Routes>

  )
}

export default AppRoutes
