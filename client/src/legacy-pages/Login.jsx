'use client'

import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import FormInput from '../components/FormInput.jsx'
import RoleToggle from '../components/RoleToggle.jsx'
import ThemeSwitcher from '../components/ThemeSwitcher.jsx'
import { useAuth } from '../context/useAuth.js'
import { resolveRoute } from '../context/AuthContextInner.jsx'

function Login() {
  const { login, loginDemo, user, token, authReady } = useAuth()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const [role, setRole] = useState('teacher')
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!authReady || !mounted || !token || !user) return
    navigate(resolveRoute(user), { replace: true })
  }, [authReady, mounted, navigate, token, user])

  const validate = () => {
    const errs = {}
    if (!form.email.trim()) errs.email = 'Email is required.'
    if (!form.password.trim()) errs.password = 'Password is required.'
    return errs
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    const fieldErrors = validate()
    if (Object.keys(fieldErrors).length > 0) { setErrors(fieldErrors); return }
    setSubmitting(true); setErrors({}); setGeneralError('')
    const { error, ok, redirectTo } = await login({ email: form.email, password: form.password, role })
    if (!ok && error) {
      if (error.fieldErrors) setErrors(error.fieldErrors)
      else if (error.message) setGeneralError(error.message)
      if (error.role) setRole(String(error.role).toLowerCase())
      setSubmitting(false); return
    }
    if (redirectTo) navigate(redirectTo, { replace: true })
    setSubmitting(false)
  }

  const handleDemoLogin = async (demoRole) => {
    if (submitting) return
    setSubmitting(true)
    setErrors({})
    setGeneralError('')
    setRole(demoRole)
    const { error, ok, redirectTo } = await loginDemo(demoRole)
    if (!ok && error) {
      if (error.message) setGeneralError(error.message)
      setSubmitting(false)
      return
    }
    if (redirectTo) navigate(redirectTo, { replace: true })
    setSubmitting(false)
  }

  if (!mounted) {
    return <div className="min-h-[100dvh] bg-[var(--board-steel-deep)]" />
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 md:p-8 bg-[var(--board-steel-deep)] relative overflow-hidden transition-colors duration-300">
      {/* Floating Theme Switcher */}
      <div className="absolute top-4 right-4 z-30">
        <ThemeSwitcher />
      </div>

      {/* Background ambient radial gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--flap-primary)]/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-[var(--flap-accent)]/15 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-[1080px] grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 items-center relative z-10 animate-auth-fade">
        {/* Left hero side */}
        <aside className="hidden lg:flex flex-col justify-between p-10 h-full rounded-2xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--flap-primary)]/15 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--flap-primary)]/15 border border-[var(--flap-accent)]/30 text-[var(--flap-accent)] text-xs font-semibold tracking-wide uppercase mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[var(--flap-accent)] animate-ping" />
              LearnAI Architecture 2.0
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-extrabold text-[var(--flap-ink)] leading-tight tracking-tight mb-4">
              Your teacher, available after class.
            </h1>

            <p className="text-[var(--flap-mute)] text-sm md:text-base leading-relaxed mb-8">
              A real teacher records once. LearnAI transforms that recording into an interactive Socratic AI tutor that teaches in <span className="text-[var(--flap-accent)] font-medium">their voice</span>, <span className="text-[var(--flap-accent)] font-medium">their explaining style</span>, and your exact syllabus.
            </p>

            {/* Feature bullets */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--board-steel-elevated)]/60 border border-[var(--board-rule)] hover:border-[var(--board-rule-strong)] transition-colors">
                <div className="w-9 h-9 rounded-lg bg-[var(--flap-primary)]/20 text-[var(--flap-accent)] flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
                  🎙️
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--flap-ink)] uppercase tracking-wider">Voice & Style Continuity</p>
                  <p className="text-xs text-[var(--flap-mute)]">Trained on actual teacher explanations and speech cadence</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--board-steel-elevated)]/60 border border-[var(--board-rule)] hover:border-[var(--board-rule-strong)] transition-colors">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-base shrink-0">
                  📐
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--flap-ink)] uppercase tracking-wider">Curriculum Bound</p>
                  <p className="text-xs text-[var(--flap-mute)]">Strictly grounded in CBSE, Cambridge, IB & College Board</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--board-steel-elevated)]/60 border border-[var(--board-rule)] hover:border-[var(--board-rule-strong)] transition-colors">
                <div className="w-9 h-9 rounded-lg bg-[var(--flap-primary)]/20 text-[var(--flap-accent)] flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
                  🧠
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--flap-ink)] uppercase tracking-wider">Socratic Guidance</p>
                  <p className="text-xs text-[var(--flap-mute)]">Step-by-step hints and reasoning instead of spoonfed answers</p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Teacher Card Preview */}
          <div className="p-4 rounded-xl bg-[var(--board-steel-elevated)]/80 border border-[var(--board-rule)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=faces"
                alt="Teacher avatar"
                className="w-10 h-10 rounded-full border-2 border-[var(--flap-accent)]/50 object-cover shadow-sm"
              />
              <div>
                <p className="text-xs font-bold text-[var(--flap-ink)]">Mr. Ram Sharma</p>
                <p className="text-[11px] text-[var(--flap-accent)]">Concept-first · 4.9 ★ (35 reviews)</p>
              </div>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 font-semibold">
              Live Tutor
            </span>
          </div>
        </aside>

        {/* Right login form side */}
        <div className="p-8 md:p-10 rounded-2xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-2xl shadow-2xl">
          <header className="mb-6">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--btn-gradient-from)] to-[var(--btn-gradient-to)] flex items-center justify-center font-black text-white text-xs shadow-sm">
                L
              </div>
              <span className="font-[family-name:var(--font-display)] font-bold text-lg text-[var(--flap-ink)]">LearnAI</span>
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--flap-ink)]">
              Welcome back
            </h2>
            <p className="text-xs md:text-sm text-[var(--flap-mute)] mt-1">
              Sign in to continue your learning journey or guide your students.
            </p>
          </header>

          <div className="mb-5">
            <RoleToggle value={role} onChange={setRole} />
          </div>

          {generalError && (
            <div className="mb-5 p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-500 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{generalError}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <FormInput
              label="Email Address"
              name="email"
              type="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
            />
            <FormInput
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••••••"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 font-semibold text-sm rounded-xl btn-gradient disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? <span className="spinner" aria-label="Loading" /> : `Sign in as ${role === 'teacher' ? 'Teacher' : 'Student'}`}
            </button>
          </form>

          {/* Quick Demo Login shortcuts */}
          <div className="mt-8 pt-6 border-t border-[var(--board-rule)]">
            <p className="mb-3 text-center text-[11px] font-semibold tracking-wider uppercase text-[var(--flap-mute)]">
              Instant 1-Click Demo Accounts
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleDemoLogin('student')}
                className="p-3 rounded-xl text-xs font-semibold text-[var(--flap-ink)] bg-[var(--board-steel-elevated)]/60 border border-[var(--board-rule)] hover:border-[var(--board-rule-strong)] transition-all cursor-pointer flex flex-col items-center gap-1 group"
              >
                <span className="text-[var(--flap-accent)] group-hover:scale-110 transition-transform">🎓 Student Mode</span>
                <span className="text-[10px] text-[var(--flap-mute)] font-normal">Rohan Samy (Class 7 CBSE)</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleDemoLogin('teacher')}
                className="p-3 rounded-xl text-xs font-semibold text-[var(--flap-ink)] bg-[var(--board-steel-elevated)]/60 border border-[var(--board-rule)] hover:border-[var(--board-rule-strong)] transition-all cursor-pointer flex flex-col items-center gap-1 group"
              >
                <span className="text-[var(--flap-accent)] group-hover:scale-110 transition-transform">👨‍🏫 Teacher Mode</span>
                <span className="text-[10px] text-[var(--flap-mute)] font-normal">Mr. Ram Sharma (Maths/Science)</span>
              </button>
            </div>

            <div className="p-3 rounded-xl border border-[var(--board-rule)] bg-[var(--flap-face)]/50 text-[11px] text-[var(--flap-mute)]">
              <div className="flex items-center justify-between mb-1.5 font-semibold text-[var(--flap-ink)]">
                <span>Demo Credentials</span>
                <span className="text-[10px] text-[var(--flap-accent)] font-normal">Click to fill</span>
              </div>
              <div
                onClick={() => {
                  setRole('student')
                  setForm({ email: 'student@learnai.dev', password: 'DemoPassword123!' })
                }}
                className="flex items-center justify-between py-1 cursor-pointer hover:text-[var(--flap-ink)] transition-colors border-b border-[var(--board-rule)]/40"
              >
                <span>Student: <code className="text-[var(--flap-accent)] font-mono">student@learnai.dev</code></span>
                <span className="text-[10px] font-mono">DemoPassword123!</span>
              </div>
              <div
                onClick={() => {
                  setRole('teacher')
                  setForm({ email: 'teacher@learnai.dev', password: 'DemoPassword123!' })
                }}
                className="flex items-center justify-between py-1 pt-1.5 cursor-pointer hover:text-[var(--flap-ink)] transition-colors"
              >
                <span>Teacher: <code className="text-[var(--flap-accent)] font-mono">teacher@learnai.dev</code></span>
                <span className="text-[10px] font-mono">DemoPassword123!</span>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-[var(--flap-mute)]">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-semibold text-[var(--flap-accent)] hover:underline ml-1">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
