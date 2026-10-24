import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './legacy-pages/Login.jsx'
import Signup from './legacy-pages/Signup.jsx'
import StudentDashboard from './legacy-pages/StudentDashboard.jsx'
import TeacherDashboard from './legacy-pages/TeacherDashboard.jsx'
import TeacherOnboarding from './legacy-pages/TeacherOnboarding.jsx'
import OnboardingComplete from './legacy-pages/OnboardingComplete.jsx'
import BoardPreviewPage from './components/BoardPreview.jsx'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/student"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute requiredRole="teacher" requireOnboarding>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher-onboarding"
            element={
              <ProtectedRoute requiredRole="teacher" requireOnboarding={false}>
                <TeacherOnboarding />
              </ProtectedRoute>
            }
          />
          <Route path="/onboarding-complete" element={<OnboardingComplete />} />
          <Route path="/board-preview" element={<BoardPreviewPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}
