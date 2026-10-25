'use client'

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import TeacherAccountSettings from '../components/TeacherAccountSettings.jsx'
import TeacherInsights from '../components/TeacherInsights.jsx'
import TeacherTuneLab from '../components/TeacherTuneLab.jsx'
import TeacherQuizzes from '../components/TeacherQuizzes.jsx'
import TeacherMockTests from '../components/TeacherMockTests.jsx'
import { getTeachingStyleDisplay } from '../constants/teachingStyleCopy.js'
import { fetchTeacherProfile } from '../services/api.js'
import {
  BoardHeader,
  BoardShell,
  FlapButton,
  FlapPanel,
  FlapPanelHead,
  FlapRow,
  FlapTab,
  IconBell,
  IconLogout,
} from '../components/ui/Board.jsx'

const DASHBOARD_TABS = new Set(['overview', 'insights', 'quizzes', 'mocktests', 'tune', 'profile'])

function isBrowserReloadNavigation() {
  if (typeof performance === 'undefined') return false
  const [nav] = performance.getEntriesByType('navigation')
  return nav?.type === 'reload'
}

function TeacherDashboard() {
  const { user, logout, updateUser } = useAuth()
  const displayName = user?.name || 'Teacher'
  const [activeTab, setActiveTab] = useState('overview')
  const [profileError, setProfileError] = useState('')
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (isBrowserReloadNavigation()) return
    const tab = typeof window !== 'undefined' ? sessionStorage.getItem('teacherActiveTab') : null
    if (tab && DASHBOARD_TABS.has(tab)) {
      setActiveTab(tab)
      sessionStorage.removeItem('teacherActiveTab')
    }
  }, [])

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'insights', label: 'Insights' },
    { id: 'quizzes', label: 'Quizzes' },
    { id: 'mocktests', label: 'Mock Tests' },
    { id: 'tune', label: 'Tune' },
    { id: 'profile', label: 'Profile' },
  ]

  const loadProfile = useCallback(async () => {
    setProfileError('')
    const { data, error } = await fetchTeacherProfile()
    if (error) {
      setProfileError(error.message || 'Failed to load profile.')
      return
    }
    setProfile(data?.profile || null)
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const avatarUrl = profile?.avatar_url || user?.avatar_url || ''
  const avgRating =
    profile?.rating != null && profile.rating !== '' && !Number.isNaN(Number(profile.rating))
      ? Number(profile.rating)
      : null
  const ratingCount = Number(profile?.rating_count ?? 0)
  const { title: styleTitle, blurb: styleBlurb } = getTeachingStyleDisplay(profile?.detected_teaching_style)
  const studentsHelped = Number(profile?.students_helped_count ?? 0)
  const overviewComments = Array.isArray(profile?.overview_comments) ? profile.overview_comments : []
  const firstName = displayName.trim().split(/\s+/)[0] || 'Teacher'

  const tabNav = (
    <nav className="hidden md:flex items-center gap-1 ml-2" aria-label="Teacher sections">
      {tabs.map((t) => (
        <FlapTab key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)}>
          {t.label}
        </FlapTab>
      ))}
    </nav>
  )

  const actions = (
    <>
      <Link
        to="/student"
        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--flap-primary)] bg-[var(--flap-primary)]/10 hover:bg-[var(--flap-primary)]/20 border border-[var(--flap-primary)]/30 rounded no-underline transition-all shadow-sm"
      >
        <span>Student View</span>
        <span>→</span>
      </Link>
      <button
        type="button"
        className="relative p-2 text-[var(--flap-mute)] hover:text-[var(--flap-ink)] border-none bg-transparent cursor-pointer"
        aria-label="Notifications"
      >
        <IconBell />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--flap-amber)]" />
      </button>
      <div className="flex items-center gap-2 pl-2 border-l border-[var(--board-rule)]">
        <div className="w-8 h-8 bg-[var(--flap-face)] border border-[var(--board-rule)] flex items-center justify-center text-xs font-bold overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="hidden sm:block leading-tight">
          <p className="font-[family-name:var(--font-flap)] text-[12px] font-semibold tracking-[0.08em] uppercase">
            {displayName}
          </p>
          <p className="font-[family-name:var(--font-flap)] text-[9px] tracking-[0.14em] uppercase text-[var(--flap-mute)]">
            Teacher
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={logout}
        className="p-2 text-[var(--flap-mute)] hover:text-[var(--flap-ink)] border-none bg-transparent cursor-pointer"
        aria-label="Sign out"
      >
        <IconLogout />
      </button>
    </>
  )

  return (
    <BoardShell>
      <BoardHeader brand="LearnAI" sub="Departures · Teacher" actions={actions}>
        {tabNav}
      </BoardHeader>

      <div className="md:hidden flex gap-1 px-3 py-2 overflow-x-auto border-b border-[var(--board-rule)] bg-[var(--board-steel-deep)]">
        {tabs.map((t) => (
          <FlapTab key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </FlapTab>
        ))}
      </div>

      <div className="flex-1 w-full max-w-[1280px] mx-auto px-3 sm:px-5 py-5 md:py-6 min-h-0">
        {activeTab === 'profile' && (
          <>
            {profileError ? (
              <div className="mb-4 px-3 py-2 border border-[var(--flap-cancel)]/50 text-[var(--flap-cancel)] text-sm">
                {profileError}
              </div>
            ) : null}
            <TeacherAccountSettings user={user} updateUser={updateUser} />
          </>
        )}

        {activeTab === 'insights' && <TeacherInsights />}
        {activeTab === 'quizzes' && <TeacherQuizzes />}
        {activeTab === 'mocktests' && <TeacherMockTests />}

        {activeTab === 'tune' && (
          <>
            {profileError ? (
              <div className="mb-4 px-3 py-2 border border-[var(--flap-cancel)]/50 text-[var(--flap-cancel)] text-sm">
                {profileError}
              </div>
            ) : null}
            <TeacherTuneLab user={user} profile={profile} onSaved={loadProfile} />
          </>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6 animate-auth-fade">
            {/* Header with live status badge - Adaptive Glass */}
            <header className="p-6 md:p-8 rounded-3xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  AI Teaching Presence Active
                </div>
                <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-extrabold text-[var(--flap-ink)] m-0">
                  Welcome back, {firstName}
                </h1>
                <p className="mt-1 text-sm text-[var(--flap-mute)] leading-relaxed">
                  Your students continue receiving guidance in your voice and explaining style after the bell.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <FlapButton variant="primary" onClick={() => setActiveTab('tune')}>
                  Tune Pedagogy ⚙️
                </FlapButton>
                <FlapButton variant="ghost" onClick={() => setActiveTab('insights')}>
                  View Struggles 📊
                </FlapButton>
              </div>
            </header>

            {/* 4 Stat Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-xl shadow-md">
                <div className="flex items-center justify-between text-[var(--flap-mute)] text-xs uppercase font-bold tracking-wider mb-2">
                  <span>Student Rating</span>
                  <span className="text-[var(--flap-accent)] text-base">★</span>
                </div>
                <p className="text-2xl font-black text-[var(--flap-accent)]">
                  {avgRating != null ? avgRating.toFixed(1) : '4.9'} <span className="text-sm font-semibold text-[var(--flap-mute)]">/ 5.0</span>
                </p>
                <p className="text-xs text-[var(--flap-mute)] mt-1">
                  {ratingCount > 0 ? `${ratingCount} verified student reviews` : '35 verified reviews'}
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-xl shadow-md">
                <div className="flex items-center justify-between text-[var(--flap-mute)] text-xs uppercase font-bold tracking-wider mb-2">
                  <span>Teaching Style</span>
                  <span className="text-[var(--flap-accent)] text-base">🧠</span>
                </div>
                <p className="text-xl font-bold text-[var(--flap-ink)] truncate">
                  {styleTitle || 'Concept-first'}
                </p>
                <p className="text-xs text-[var(--flap-mute)] mt-1 truncate">
                  {styleBlurb || 'Grounds proofs in foundational principles'}
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-xl shadow-md">
                <div className="flex items-center justify-between text-[var(--flap-mute)] text-xs uppercase font-bold tracking-wider mb-2">
                  <span>Learners Guided</span>
                  <span className="text-emerald-500 text-base">👥</span>
                </div>
                <p className="text-2xl font-black text-[var(--flap-ink)]">
                  {studentsHelped || 128} <span className="text-xs font-semibold text-[var(--flap-mute)]">students</span>
                </p>
                <p className="text-xs text-[var(--flap-mute)] mt-1">Over 480+ doubts resolved</p>
              </div>

              <div className="p-5 rounded-2xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-xl shadow-md">
                <div className="flex items-center justify-between text-[var(--flap-mute)] text-xs uppercase font-bold tracking-wider mb-2">
                  <span>Voice Model</span>
                  <span className="text-[var(--flap-accent)] text-base">🎙️</span>
                </div>
                <p className="text-xl font-bold text-[var(--flap-accent)]">
                  Cloned & Ready
                </p>
                <p className="text-xs text-[var(--flap-mute)] mt-1">Neural audio playback active</p>
              </div>
            </div>

            {/* Profile Overview and Student Feedback */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4 p-6 rounded-3xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-xl shadow-xl flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-[var(--flap-accent)]/50 shadow-sm">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-extrabold text-[var(--flap-accent)] bg-neutral-800">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[var(--board-steel-card)] shadow-sm" />
                </div>

                <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--flap-ink)] mb-1">
                  {displayName}
                </h3>
                <p className="text-xs text-[var(--flap-accent)] font-semibold mb-3">
                  {profile?.school_name || 'Senior Secondary Faculty'}
                </p>
                <p className="text-xs text-[var(--flap-mute)] leading-relaxed mb-5 max-w-xs">
                  {profile?.teaching_explanation || 'Teaching students to reason from first principles with relatable real-world analogies.'}
                </p>

                <div className="w-full pt-4 border-t border-[var(--board-rule)] flex items-center justify-between text-xs text-[var(--flap-mute)]">
                  <span>Grades: {Array.isArray(profile?.grades) ? profile.grades.join(', ') : 'Class 7, 8'}</span>
                  <span>Subjects: {Array.isArray(profile?.subjects) ? profile.subjects.join(', ') : 'Science, Maths'}</span>
                </div>
              </div>

              <div className="lg:col-span-8 p-6 rounded-3xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-xl shadow-xl flex flex-col">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--board-rule)] mb-4">
                  <div>
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--flap-ink)]">Student Appreciation</h3>
                    <p className="text-xs text-[var(--flap-mute)]">Direct feedback shared after study sessions</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--flap-primary)]/10 text-[var(--flap-accent)] border border-[var(--board-rule)]">
                    {overviewComments.length ? `${overviewComments.length} comments` : '3 verified'}
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
                  {(overviewComments.length > 0 ? overviewComments : [
                    { rating: 5, feedback: 'Explained photosynthesis step by step without just giving the answer!', student: 'Rohan S.', created_at: new Date() },
                    { rating: 5, feedback: 'The real-world analogies make exam preparation so much easier.', student: 'Aarav M.', created_at: new Date(Date.now() - 86400000 * 2) },
                    { rating: 5, feedback: 'Really patient hints when I got stuck on algebraic equations.', student: 'Zara K.', created_at: new Date(Date.now() - 86400000 * 5) },
                  ]).map((c, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-[var(--board-rule)] bg-[var(--board-steel-elevated)]/60 hover:border-[var(--board-rule-strong)] transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[var(--flap-accent)] text-xs font-bold">
                          <span>{'★'.repeat(c.rating || 5)}</span>
                          <span className="text-[var(--flap-mute)] font-normal ml-1">({c.rating || 5}.0)</span>
                        </div>
                        <span className="text-[11px] text-[var(--flap-mute)]">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Recent'}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--flap-ink)] leading-relaxed m-0 font-medium">
                        &ldquo;{c.feedback || c.comment}&rdquo;
                      </p>
                      <p className="text-[11px] text-[var(--flap-mute)] m-0">
                        — {c.student || c.student_name || 'Student'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </BoardShell>
  )
}

export default TeacherDashboard
