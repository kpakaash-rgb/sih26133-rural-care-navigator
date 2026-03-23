import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './Layout.jsx'
import { AuthProvider } from './AuthContext.jsx'
import './design-system.css'
import './index.css'

// Lazy load pages for code splitting
const LandingPage = React.lazy(() => import('./pages/LandingPage'))
const TeamPage = React.lazy(() => import('./pages/TeamPage'))
const DashboardPage = React.lazy(() => import('./Dashboard.jsx'))
const ChallengesPage = React.lazy(() => import('./pages/ChallengesPage'))
const ScoreboardPage = React.lazy(() => import('./pages/ScoreboardPage'))
const LoginPage = React.lazy(() => import('./Login.jsx'))
const AdminLoginPage = React.lazy(() => import('./AdminLogin.jsx'))
const AdminDashboardPage = React.lazy(() => import('./AdminDashboard.jsx'))
const CreateChallengePage = React.lazy(() => import('./CreateChallenge.jsx'))
const SubmissionsLogPage = React.lazy(() => import('./SubmissionsLog.jsx'))

// Suspense fallback component
const SuspenseFallback = () => (
  <div className="min-h-screen w-full bg-gradient-to-br from-[#0A1628] via-[#0D1B36] to-[#0A1628] flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Admin Login - Hidden route, only accessible via URL */}
          <Route 
            path="/naandhaaadmin" 
            element={
              <Suspense fallback={<SuspenseFallback />}>
                <AdminLoginPage />
              </Suspense>
            } 
          />
          
          {/* Admin Dashboard - Hidden route, only accessible via URL */}
          <Route 
            path="/naandhaaadmin/dashboard" 
            element={
              <Suspense fallback={<SuspenseFallback />}>
                <AdminDashboardPage />
              </Suspense>
            } 
          />
          
          {/* Create Challenge - Hidden admin route */}
          <Route 
            path="/naandhaaadmin/create-challenge" 
            element={
              <Suspense fallback={<SuspenseFallback />}>
                <CreateChallengePage />
              </Suspense>
            } 
          />

          {/* Submissions Log - Hidden admin route */}
          <Route 
            path="/naandhaaadmin/submissions" 
            element={
              <Suspense fallback={<SuspenseFallback />}>
                <SubmissionsLogPage />
              </Suspense>
            } 
          />
          
          <Route element={<Layout />}>
            {/* Landing/Registration Page */}
            <Route 
              path="/" 
              element={
                <Suspense fallback={<SuspenseFallback />}>
                  <LandingPage />
                </Suspense>
              } 
            />
            
            {/* Login Page */}
            <Route 
              path="/login" 
              element={
                <Suspense fallback={<SuspenseFallback />}>
                  <LoginPage />
                </Suspense>
              } 
            />
            
            {/* Team Page (Create/Join Team) */}
            <Route 
              path="/team" 
              element={
                <Suspense fallback={<SuspenseFallback />}>
                  <TeamPage />
                </Suspense>
              } 
            />

            {/* Team Dashboard */}
            <Route 
              path="/dashboard" 
              element={
                <Suspense fallback={<SuspenseFallback />}>
                  <DashboardPage />
                </Suspense>
              } 
            />
            
            {/* Challenges Page */}
            <Route 
              path="/challenges" 
              element={
                <Suspense fallback={<SuspenseFallback />}>
                  <ChallengesPage />
                </Suspense>
              } 
            />
            
            {/* Scoreboard Page */}
            <Route 
              path="/scoreboard" 
              element={
                <Suspense fallback={<SuspenseFallback />}>
                  <ScoreboardPage />
                </Suspense>
              } 
            />
            
            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
