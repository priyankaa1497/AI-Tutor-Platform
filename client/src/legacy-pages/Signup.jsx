'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import FormInput from '../components/FormInput.jsx'
import InstitutionInput from '../components/InstitutionInput.jsx'
import RoleToggle from '../components/RoleToggle.jsx'
import SubjectChips from '../components/SubjectChips.jsx'
import ThemeSwitcher from '../components/ThemeSwitcher.jsx'
import { useAuth } from '../context/useAuth.js'
import {
  ensureInstitution,
  ensureSubject,
  fetchBoards,
  registerStudent,
  registerTeacher,
  resendOtp,
  searchInstitutions,
  searchSubjects,
  verifyOtp,
} from '../services/api.js'

function Signup() {
  const navigate = useNavigate()
  const { user, role: authRole, updateUser, setAuthSession } = useAuth()
  const [role, setRole] = useState('teacher')
  const [form, setForm] = useState({
    name: '',
    subjects: [],
    grade: '',
    boardId: '',
    institution: null,
    currentGrade: '',
    email: '',
    password: '',
    password_confirmation: '',
  })
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [subjectSuggestions, setSubjectSuggestions] = useState([])
  const [institutionSuggestions, setInstitutionSuggestions] = useState([])
  const [boards, setBoards] = useState([])
  const [displayedOtp, setDisplayedOtp] = useState('')
  const [otpStage, setOtpStage] = useState(false)
  const [otp, setOtp] = useState(Array(6).fill(''))
  const [otpError, setOtpError] = useState('')
  const [otpSubmitting, setOtpSubmitting] = useState(false)
  const [otpResending, setOtpResending] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [pendingUserId, setPendingUserId] = useState(null)
  const [pendingRole, setPendingRole] = useState('student')
  const otpInputsRef = useRef([])

  const OTP_RESEND_SECONDS = 180
  const OTP_RESEND_KEY = 'otpResendAvailableAt'
  const isTeacher = role === 'teacher'

  const startResendCountdown = (seconds) => {
    const wait = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : OTP_RESEND_SECONDS
    const availableAt = Date.now() + wait * 1000
    localStorage.setItem(OTP_RESEND_KEY, String(availableAt))
    setResendCountdown(wait)
  }

  useEffect(() => {
    if (!user?.id || user?.otp_verified) return
    setOtpStage(true)
    setPendingUserId(user.id)
    setPendingRole(user.role || authRole || 'student')
    const stored = localStorage.getItem('dev_otp')
    if (stored) {
      setDisplayedOtp(stored)
      setOtp(stored.split('').slice(0, 6))
    }
  }, [authRole, user])

  useEffect(() => {
    let mounted = true
    const loadBoards = async () => {
      const list = await fetchBoards()
      if (!mounted) return
      setBoards(list)
    }
    loadBoards()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const fromStorage = Number(localStorage.getItem(OTP_RESEND_KEY) || 0)
    const remaining = Math.max(0, Math.ceil((fromStorage - Date.now()) / 1000))
    setResendCountdown(remaining)
  }, [otpStage])

  useEffect(() => {
    if (!otpStage || resendCountdown <= 0) return undefined
    const timer = setInterval(() => {
      setResendCountdown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [otpStage, resendCountdown])

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required.'
    if (!form.email.trim()) errs.email = 'Email is required.'
    if (!form.password) errs.password = 'Password is required.'
    if (!form.password_confirmation) {
      errs.password_confirmation = 'Please confirm your password.'
    } else if (form.password !== form.password_confirmation) {
      errs.password_confirmation = 'Passwords do not match.'
    }
    if (isTeacher) {
      if (form.subjects.length === 0) errs.subjects = 'Please add at least one subject.'
      if (!form.grade.trim()) errs.grade = 'Grade is required.'
      if (!form.institution) errs.institution = 'Institution is required.'
    } else {
      if (!form.boardId) errs.board_id = 'Board is required.'
      if (!form.currentGrade.trim()) errs.currentGrade = 'Current grade is required.'
      if (!form.institution) errs.institution = 'Institution is required.'
    }
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
    setSubmitting(true); setErrors({}); setGeneralError(''); setSubjectSuggestions([])

    const payload =
      role === 'teacher'
        ? { name: form.name, subjects: form.subjects.map((s) => s.label), grade: form.grade, institution: form.institution?.label ?? '', email: form.email, password: form.password, password_confirmation: form.password_confirmation }
        : {
            name: form.name,
            board_id: Number(form.boardId),
            current_grade: Number(form.currentGrade),
            institution: form.institution?.label ?? '',
            email: form.email,
            password: form.password,
            password_confirmation: form.password_confirmation,
          }

    const { data, error } = role === 'teacher' ? await registerTeacher(payload) : await registerStudent(payload)

    if (error) {
      if (error.fieldErrors) setErrors(error.fieldErrors)
      else if (error.message) setGeneralError(error.message)
      setSubmitting(false); return
    }

    // Persist returned user (with ID) into auth state for OTP page
    if (data?.user) {
      const returnedUser = { ...data.user, otp_verified: false, onboarding_completed: false }
      const token = data.token || `pending-${Date.now()}`
      setAuthSession(token, returnedUser, role)
      if (data.otp_code) {
        const code = String(data.otp_code)
        localStorage.setItem('dev_otp', code)
        setDisplayedOtp(code)
        setOtp(code.split('').slice(0, 6))
      }
      setPendingUserId(returnedUser.id)
      setPendingRole(role)
    }

    setSubmitting(false)
    setOtpError('')
    setOtpStage(true)
  }

  const handleVerifyOtp = async () => {
    if (!pendingUserId) {
      setOtpError('Session expired. Please sign up again.')
      return
    }
    const code = displayedOtp || otp.join('')
    if (!code || code.length < 6) {
      setOtpError('OTP is not available. Please sign up again.')
      return
    }

    setOtpSubmitting(true)
    setOtpError('')
    const { data, error } = await verifyOtp({
      user_id: pendingUserId,
      otp_code: code,
    })
    setOtpSubmitting(false)

    if (error) {
      setOtpError(error.message || 'Invalid OTP. Please try again.')
      return
    }

    localStorage.removeItem(OTP_RESEND_KEY)
    const patch = pendingRole === 'teacher'
      ? { otp_verified: true, onboarding_completed: false }
      : { otp_verified: true }
    const nextUser = { ...(user || {}), ...patch, id: pendingUserId, role: pendingRole }
    const nextToken = data?.token || `fake-jwt-token-${pendingUserId}`
    setAuthSession(nextToken, nextUser, pendingRole)
    navigate(pendingRole === 'teacher' ? '/teacher-onboarding' : '/student', { replace: true })
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 md:p-8 bg-[var(--board-steel-deep)] relative overflow-hidden transition-colors duration-300">
      {/* Floating Theme Switcher */}
      <div className="absolute top-4 right-4 z-30">
        <ThemeSwitcher />
      </div>

      {/* Background ambient radial gradients */}
      <div className="absolute top-1/4 right-1/4 translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--flap-primary)]/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 -translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-[var(--flap-accent)]/15 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-[1080px] grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8 items-center relative z-10 animate-auth-fade my-6">
        {/* Left side value hero */}
        <aside className="hidden lg:flex flex-col justify-between p-10 h-full rounded-2xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--flap-primary)]/15 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--flap-primary)]/15 border border-[var(--flap-accent)]/30 text-[var(--flap-accent)] text-xs font-semibold tracking-wide uppercase mb-6 shadow-sm">
              <span>🚀</span>
              Join LearnAI
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-extrabold text-[var(--flap-ink)] leading-tight tracking-tight mb-4">
              Learn deeper. Teach without limits.
            </h1>

            <p className="text-[var(--flap-mute)] text-sm leading-relaxed mb-6">
              Whether you are a student seeking 24/7 tutor clarity or a teacher looking to scale your personal teaching identity, LearnAI bridges the classroom gap.
            </p>

            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-xl bg-[var(--board-steel-elevated)]/60 border border-[var(--board-rule)]">
                <p className="text-xs font-bold text-[var(--flap-accent)] uppercase tracking-wider mb-1">For Students</p>
                <p className="text-xs text-[var(--flap-mute)]">
                  Always-available help from your trusted teacher, aligned strictly to your exact school curriculum board and chapter topics.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[var(--board-steel-elevated)]/60 border border-[var(--board-rule)]">
                <p className="text-xs font-bold text-[var(--flap-accent)] uppercase tracking-wider mb-1">For Teachers</p>
                <p className="text-xs text-[var(--flap-mute)]">
                  Record one 35s voice sample. Our AI captures your pedagogy and answers your students 24/7, providing you aggregate struggle analytics.
                </p>
              </div>
            </div>
          </div>

          <div className="text-xs text-[var(--flap-mute)] border-t border-[var(--board-rule)] pt-4">
            Secured with end-to-end curriculum alignment and privacy-first student logging.
          </div>
        </aside>

        {/* Right side registration form */}
        <div className="p-8 md:p-10 rounded-2xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-2xl shadow-2xl">
          {!otpStage ? (
            <>
              <header className="mb-6">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--btn-gradient-from)] to-[var(--btn-gradient-to)] flex items-center justify-center font-black text-white text-xs shadow-sm">
                    L
                  </div>
                  <span className="font-[family-name:var(--font-display)] font-bold text-lg text-[var(--flap-ink)]">LearnAI</span>
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--flap-ink)]">
                  Create your account
                </h2>
                <p className="text-xs md:text-sm text-[var(--flap-mute)] mt-1">
                  Select your role to configure your learning or teaching workspace.
                </p>
              </header>

              <div className="mb-5">
                <RoleToggle value={role} onChange={setRole} />
              </div>

              {generalError && (
                <div className="mb-5 p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-xs flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{generalError}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <FormInput
                  label="Full Name"
                  name="name"
                  placeholder="e.g. Dr. Jane Doe"
                  value={form.name}
                  onChange={handleChange}
                  error={errors.name}
                  required
                />

                {isTeacher ? (
                  <>
                    <SubjectChips
                      value={form.subjects}
                      onChange={(subjects) => setForm((prev) => ({ ...prev, subjects }))}
                      suggestions={subjectSuggestions}
                      onSearch={async (q) => setSubjectSuggestions(await searchSubjects(q))}
                      onEnsureSubject={ensureSubject}
                      error={errors.subjects}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormInput
                        label="Grades Taught"
                        name="grade"
                        value={form.grade}
                        onChange={handleChange}
                        placeholder="E.g. Class 7, 8, 9"
                        error={errors.grade}
                        required
                      />
                      <InstitutionInput
                        value={form.institution}
                        onChange={(inst) => setForm((prev) => ({ ...prev, institution: inst }))}
                        suggestions={institutionSuggestions}
                        onSearch={async (q) => setInstitutionSuggestions(await searchInstitutions(q))}
                        onEnsure={ensureInstitution}
                        error={errors.institution}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <FormInput
                      label="Curriculum Board"
                      name="boardId"
                      value={form.boardId}
                      onChange={handleChange}
                      as="select"
                      options={[{ value: '', label: 'Select your curriculum board' }, ...boards.map((b) => ({ value: String(b.id), label: b.name }))]}
                      error={errors.board_id}
                      required
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormInput
                        label="Current Grade / Class"
                        name="currentGrade"
                        value={form.currentGrade}
                        onChange={handleChange}
                        placeholder="E.g. 7"
                        error={errors.current_grade || errors.currentGrade}
                        required
                      />
                      <InstitutionInput
                        value={form.institution}
                        onChange={(inst) => setForm((prev) => ({ ...prev, institution: inst }))}
                        suggestions={institutionSuggestions}
                        onSearch={async (q) => setInstitutionSuggestions(await searchInstitutions(q))}
                        onEnsure={ensureInstitution}
                        error={errors.institution}
                      />
                    </div>
                  </>
                )}

                <FormInput
                  label="Email Address"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={handleChange}
                  error={errors.email}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormInput
                    label="Password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    error={errors.password}
                    required
                  />
                  <FormInput
                    label="Confirm Password"
                    name="password_confirmation"
                    type="password"
                    placeholder="••••••••"
                    value={form.password_confirmation}
                    onChange={handleChange}
                    error={errors.password_confirmation}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-3 py-3 px-4 font-semibold text-sm rounded-xl btn-gradient disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? <span className="spinner" aria-label="Loading" /> : `Complete Sign Up as ${isTeacher ? 'Teacher' : 'Student'}`}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-[var(--flap-mute)]">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-[var(--flap-accent)] hover:underline ml-1">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <div className="py-4">
              <header className="mb-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[var(--flap-primary)]/15 border border-[var(--flap-accent)]/30 text-[var(--flap-accent)] flex items-center justify-center mx-auto mb-3 text-xl shadow-sm">
                  ✉️
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--flap-ink)]">
                  Verify your account
                </h2>
                <p className="text-xs text-[var(--flap-mute)] mt-1 max-w-sm mx-auto">
                  During development, your one-time verification passkey is generated automatically below.
                </p>
              </header>

              <div className="mb-6 p-6 rounded-2xl border border-[var(--board-rule-strong)] bg-[var(--board-steel-elevated)]/80 text-center shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--flap-accent)] mb-2">Development Access Code</p>
                <div className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-[0.3em] text-[var(--flap-ink)] my-3 select-all">
                  {displayedOtp || '------'}
                </div>
                <p className="text-[11px] text-[var(--flap-mute)]">One-click auto-filled for instant verification</p>
              </div>

              {otpError && (
                <div className="mb-4 p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-500 text-xs text-center">
                  {otpError}
                </div>
              )}

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={otpSubmitting || !displayedOtp}
                className="w-full py-3.5 px-4 font-semibold text-sm rounded-xl btn-gradient disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {otpSubmitting ? <span className="spinner" aria-label="Loading" /> : 'Verify & Launch Dashboard →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Signup
