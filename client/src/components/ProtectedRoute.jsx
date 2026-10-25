'use client'

import PropTypes from 'prop-types'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { accountRole, resolveRoute } from '../context/AuthContextInner.jsx'

function ProtectedRoute({ children, requiredRole, requireOnboarding = true }) {
  const { isAuthenticated, role, user, authReady } = useAuth()
  const navigate = useNavigate()
  const effectiveRole = accountRole(user, role)

  useEffect(() => {
    if (!authReady) return
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
    // If user is accessing teacher onboarding but already completed it, or vice versa
    if (requiredRole === 'teacher' && effectiveRole === 'teacher') {
      if (requireOnboarding && !user?.onboarding_completed) {
        navigate('/teacher-onboarding', { replace: true })
      }
    }
  }, [
    authReady,
    effectiveRole,
    isAuthenticated,
    requireOnboarding,
    requiredRole,
    navigate,
    user,
  ])

  if (!authReady || !isAuthenticated) {
    return <div className="min-h-screen bg-[#eff6ff]" aria-hidden="true" />
  }
  if (requiredRole === 'teacher' && effectiveRole === 'teacher' && requireOnboarding && !user?.onboarding_completed) {
    return <div className="min-h-screen bg-[#eff6ff]" aria-hidden="true" />
  }
  return children
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requiredRole: PropTypes.oneOf(['teacher', 'student']),
  requireOnboarding: PropTypes.bool,
}

export default ProtectedRoute
