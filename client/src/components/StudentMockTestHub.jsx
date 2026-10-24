'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchStudentMockTests,
  startStudentMockTest,
  submitStudentMockTest,
  retakeStudentMockTest,
} from '../services/api.js'
import { FlapPanel, FlapPanelHead, FlapButton, FlapRow } from './ui/Board.jsx'

export default function StudentMockTestHub({ onLearnTopic }) {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSession, setActiveSession] = useState(null)
  const [busy, setBusy] = useState(false)
  const [filterBucket, setFilterBucket] = useState('all')

  const loadTests = async () => {
    setLoading(true)
    setError('')
    const { data, error: err } = await fetchStudentMockTests()
    setLoading(false)
    if (err) {
      setError(err.message || 'Could not load mock tests.')
      return
    }
    setTests(data?.mock_tests || [])
  }

  useEffect(() => {
    loadTests()
  }, [])

  const handleStartTest = async (testId) => {
    setBusy(true)
    setError('')
    const { data, error: err } = await startStudentMockTest(testId)
    setBusy(false)
    if (err) {
      setError(err.message || 'Could not start mock test.')
      return
    }
    setActiveSession(data)
  }

  const handleRetake = async (testId) => {
    setBusy(true)
    const { error: err } = await retakeStudentMockTest(testId)
    setBusy(false)
    if (err) {
      setError(err.message || 'Could not reset test.')
      return
    }
    handleStartTest(testId)
  }

  if (activeSession) {
    return (
      <MockTestExamPlayer
        session={activeSession}
        onExit={() => {
          setActiveSession(null)
          loadTests()
        }}
        onLearnTopic={onLearnTopic}
      />
    )
  }

  const filteredTests = tests.filter((t) => {
    if (filterBucket === 'all') return true
    return t.bucket === filterBucket
  })

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6 animate-auth-fade pb-10">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--flap-accent)]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--flap-primary)]/15 border border-[var(--flap-accent)]/30 text-[var(--flap-accent)] text-xs font-semibold uppercase tracking-wider mb-3">
            <span>⏱️</span>
            <span>Timed Board Exam Simulator</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-extrabold text-[var(--flap-ink)] tracking-tight mb-2">
            Standardized Mock Tests
          </h1>
          <p className="text-[var(--flap-mute)] text-sm leading-relaxed">
            Practice under real board examination conditions. Features live countdown timers, question palettes, marked-for-review tags, and detailed diagnostic scorecards.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="mt-6 flex items-center gap-2 flex-wrap pt-4 border-t border-[var(--board-rule)]">
          {[
            { id: 'all', label: `All Tests (${tests.length})` },
            { id: 'available', label: `Available (${tests.filter((t) => t.bucket === 'available').length})` },
            { id: 'active', label: `In Progress (${tests.filter((t) => t.bucket === 'active').length})` },
            { id: 'completed', label: `Completed (${tests.filter((t) => t.bucket === 'completed').length})` },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilterBucket(chip.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterBucket === chip.id
                  ? 'bg-[var(--flap-accent)] text-white shadow-sm'
                  : 'bg-[var(--board-steel-elevated)] text-[var(--flap-mute)] hover:text-[var(--flap-ink)] border border-[var(--board-rule)]'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl border border-[var(--flap-cancel)]/40 bg-[var(--flap-face)] text-sm text-[var(--flap-cancel)]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="p-12 text-center text-[var(--flap-mute)] font-[family-name:var(--font-flap)] text-sm uppercase tracking-widest">
          Loading examinations…
        </div>
      ) : null}

      {!loading && filteredTests.length === 0 ? (
        <FlapPanel className="p-10 text-center">
          <p className="text-3xl mb-3">📋</p>
          <p className="font-[family-name:var(--font-flap)] text-sm uppercase tracking-wider text-[var(--flap-mute)] mb-1">
            No mock tests found in this section
          </p>
          <p className="text-xs text-[var(--flap-mute)]">
            Tests published by your teachers calibrated to your grade and syllabus will appear here.
          </p>
        </FlapPanel>
      ) : null}

      {/* Test Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredTests.map((test) => {
          const isCompleted = test.bucket === 'completed'
          const isInProgress = test.bucket === 'active'
          const score = test.score_percent

          return (
            <div
              key={test.id}
              className="p-6 rounded-3xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] hover:border-[var(--board-rule-strong)] transition-all shadow-md flex flex-col justify-between group relative overflow-hidden"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[var(--flap-primary)]/15 text-[var(--flap-accent)] border border-[var(--flap-accent)]/20">
                      {test.subject_label || 'Science'}
                    </span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-[var(--board-steel-elevated)] text-[var(--flap-mute)] border border-[var(--board-rule)]">
                      {test.grade_label || 'Class 7'}
                    </span>
                  </div>

                  {isCompleted ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 flex items-center gap-1">
                      <span>✓</span>
                      <span>Score: {score != null ? `${score}%` : 'Done'}</span>
                    </span>
                  ) : isInProgress ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/25 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>In Progress</span>
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--board-steel-elevated)] text-[var(--flap-mute)] border border-[var(--board-rule)]">
                      Ready to Start
                    </span>
                  )}
                </div>

                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--flap-ink)] group-hover:text-[var(--flap-accent)] transition-colors mb-1.5">
                  {test.title}
                </h3>
                <p className="text-xs text-[var(--flap-mute)] mb-4">
                  {test.lesson_title} {test.topic_title ? `· ${test.topic_title}` : ''}
                </p>

                {/* Exam Key Specs */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[var(--board-steel-elevated)]/60 border border-[var(--board-rule)] text-center mb-5">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-[var(--flap-mute)]">Duration</p>
                    <p className="text-sm font-bold text-[var(--flap-ink)] mt-0.5">⏱️ {test.duration_minutes || 20}m</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-[var(--flap-mute)]">Questions</p>
                    <p className="text-sm font-bold text-[var(--flap-ink)] mt-0.5">📝 {test.question_count || 5} Qs</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-[var(--flap-mute)]">Marks</p>
                    <p className="text-sm font-bold text-[var(--flap-accent)] mt-0.5">🏆 {test.total_marks || 100} M</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-[var(--board-rule)]">
                {isCompleted ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleStartTest(test.id)}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[var(--board-steel-elevated)] text-[var(--flap-ink)] hover:bg-[var(--board-steel-card)] border border-[var(--board-rule)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>📊 Review Scorecard</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleRetake(test.id)}
                      className="py-2.5 px-4 rounded-xl text-xs font-bold btn-gradient text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>🔄 Retake Test</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleStartTest(test.id)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold btn-gradient text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span>{isInProgress ? 'Resume Examination' : 'Begin Mock Examination'}</span>
                    <span>→</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Full Exam Simulator Component
 */
function MockTestExamPlayer({ session, onExit, onLearnTopic }) {
  const quiz = session.quiz || {}
  const questions = session.questions || []
  const initialSummary = session.summary || null
  const isInitiallyCompleted = session.attempt?.status === 'completed'

  // If already completed, show scorecard mode
  const [scorecard, setScorecard] = useState(initialSummary)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [markedForReview, setMarkedForReview] = useState(new Set())
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Timer: duration in seconds
  const durationSeconds = (quiz.duration_minutes || 20) * 60
  const [timeLeft, setTimeLeft] = useState(durationSeconds)
  const [timeSpent, setTimeSpent] = useState(0)

  // Populate any pre-existing answers
  useEffect(() => {
    const initialMap = {}
    questions.forEach((q) => {
      if (q.user_answer) {
        initialMap[q.id] = q.user_answer
      }
    })
    setAnswers(initialMap)
  }, [questions])

  // Countdown timer effect
  useEffect(() => {
    if (scorecard) return // Don't run timer if already on scorecard

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
      setTimeSpent((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [scorecard])

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const currentQ = questions[currentIndex] || questions[0]
  const currentQId = currentQ?.id

  const handleSelectOption = (opt) => {
    if (scorecard) return
    setAnswers((prev) => ({
      ...prev,
      [currentQId]: opt,
    }))
  }

  const handleClearSelection = () => {
    if (scorecard) return
    setAnswers((prev) => {
      const copy = { ...prev }
      delete copy[currentQId]
      return copy
    })
  }

  const toggleMarkForReview = () => {
    if (scorecard) return
    setMarkedForReview((prev) => {
      const copy = new Set(prev)
      if (copy.has(currentQId)) {
        copy.delete(currentQId)
      } else {
        copy.add(currentQId)
      }
      return copy
    })
  }

  const handleAutoSubmit = async () => {
    await performSubmit()
  }

  const performSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')
    const payload = {
      answers,
      marked_for_review: Array.from(markedForReview),
      time_spent_seconds: timeSpent,
    }

    const { data, error: err } = await submitStudentMockTest(quiz.id, payload)
    setSubmitting(false)
    if (err) {
      setSubmitError(err.message || 'Submission failed. Please try again.')
      return
    }

    setConfirmSubmitOpen(false)
    setScorecard(data.summary)
  }

  const answeredCount = Object.keys(answers).length
  const totalQuestions = questions.length
  const reviewCount = markedForReview.size
  const isUrgentTime = timeLeft < 300 // Under 5 mins

  // --- SCORECARD REVIEW SCREEN ---
  if (scorecard) {
    const pct = scorecard.score_percent ?? 0
    const passed = scorecard.passed
    const detailedResults = scorecard.detailed_results || []

    return (
      <div className="flex-1 min-h-0 overflow-y-auto space-y-6 animate-auth-fade pb-10">
        {/* Top return bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--flap-mute)] hover:text-[var(--flap-ink)] bg-[var(--board-steel-elevated)] border border-[var(--board-rule)] transition-colors cursor-pointer"
          >
            ← Back to Mock Tests
          </button>
          <span className="text-xs font-semibold text-[var(--flap-mute)]">
            Exam Submission Verified
          </span>
        </div>

        {/* Hero Scorecard */}
        <div className="p-8 md:p-10 rounded-3xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-2xl shadow-xl relative overflow-hidden text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 bg-[var(--flap-primary)]/15 text-[var(--flap-accent)] border border-[var(--flap-accent)]/20">
              <span>{passed ? '🏆 Examination Cleared' : '📝 Revision Advised'}</span>
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-extrabold text-[var(--flap-ink)] tracking-tight mb-2">
              {quiz.title}
            </h1>
            <p className="text-sm text-[var(--flap-mute)] leading-relaxed">
              {passed
                ? 'Excellent work! You demonstrated strong mastery over the core competencies and examination question formats.'
                : 'Good attempt! Certain topics require targeted revision before your final board exams. Use the question diagnostics below.'}
            </p>

            <div className="mt-5 flex flex-wrap gap-3 items-center justify-center md:justify-start">
              <span className="px-3 py-1.5 rounded-xl bg-[var(--board-steel-elevated)] text-xs font-semibold text-[var(--flap-ink)] border border-[var(--board-rule)]">
                ⏱️ Time: {Math.floor(scorecard.time_spent_seconds / 60)}m {scorecard.time_spent_seconds % 60}s
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-[var(--board-steel-elevated)] text-xs font-semibold text-[var(--flap-ink)] border border-[var(--board-rule)]">
                🎯 Accuracy: {scorecard.correct_count} / {scorecard.total_questions} Correct
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-[var(--board-steel-elevated)] text-xs font-semibold text-[var(--flap-ink)] border border-[var(--board-rule)]">
                🏆 Marks: {scorecard.marks_obtained} / {scorecard.total_marks}
              </span>
            </div>
          </div>

          {/* Big Score Gauge Badge */}
          <div className="shrink-0 flex flex-col items-center justify-center p-6 rounded-3xl border border-[var(--board-rule)] bg-[var(--board-steel-elevated)] shadow-inner min-w-[200px]">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--flap-mute)] mb-1">Total Score</p>
            <div className="text-5xl font-black text-[var(--flap-accent)] font-[family-name:var(--font-display)]">
              {pct}%
            </div>
            <p className={`text-xs font-extrabold uppercase mt-2 px-2.5 py-0.5 rounded-full ${passed ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
              {passed ? 'Distinction Pass' : 'Review Needed'}
            </p>
          </div>
        </div>

        {/* Detailed Diagnostics Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--flap-ink)]">
              Question-by-Question Diagnostic Analysis
            </h2>
            <span className="text-xs text-[var(--flap-mute)]">
              {detailedResults.length} Questions Examined
            </span>
          </div>

          <div className="space-y-4">
            {detailedResults.map((item, idx) => {
              const isCorrect = item.is_correct
              const unattempted = !item.user_answer

              return (
                <div
                  key={item.question_id || idx}
                  className={`p-6 rounded-2xl border transition-all ${
                    isCorrect
                      ? 'border-emerald-500/30 bg-emerald-500/[0.03]'
                      : unattempted
                      ? 'border-[var(--board-rule)] bg-[var(--board-steel-card)]'
                      : 'border-rose-500/30 bg-rose-500/[0.03]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="text-xs font-bold text-[var(--flap-mute)] uppercase tracking-wider">
                      Question {idx + 1} · {item.topic_title}
                    </span>

                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        isCorrect
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                          : unattempted
                          ? 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                          : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                      }`}
                    >
                      {isCorrect ? '✓ Correct' : unattempted ? '○ Unanswered' : '✕ Incorrect'}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-[var(--flap-ink)] mb-4 leading-relaxed">
                    {item.prompt}
                  </p>

                  {/* Options display */}
                  <div className="space-y-2 mb-4">
                    {(item.options || []).map((opt, optIdx) => {
                      const isGiven = item.user_answer === opt
                      const isExpected = item.correct_answer === opt || opt.startsWith(item.correct_answer + '.')

                      let optClasses = 'border-[var(--board-rule)] bg-[var(--board-steel-elevated)]/40 text-[var(--flap-mute)]'
                      if (isExpected) {
                        optClasses = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500 font-semibold'
                      } else if (isGiven && !isCorrect) {
                        optClasses = 'border-rose-500/50 bg-rose-500/10 text-rose-500 font-semibold'
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${optClasses}`}
                        >
                          <span>{opt}</span>
                          {isExpected && <span className="text-[11px] font-bold">✓ Correct Answer</span>}
                          {isGiven && !isExpected && <span className="text-[11px] font-bold">Your Response</span>}
                        </div>
                      )
                    })}
                  </div>

                  {/* Explanation card */}
                  <div className="p-4 rounded-xl bg-[var(--board-steel-elevated)] border border-[var(--board-rule)] text-xs space-y-1.5">
                    <p className="font-bold text-[var(--flap-ink)] flex items-center gap-1.5">
                      <span>💡 Detailed Board Solution & Rationale:</span>
                    </p>
                    <p className="text-[var(--flap-mute)] leading-relaxed">
                      {item.explanation || 'Refer to the curriculum chapter notes.'}
                    </p>
                    {item.misconception_hint && (
                      <p className="text-[var(--flap-accent)] text-[11px] pt-1 border-t border-[var(--board-rule)] font-medium">
                        Pitfall to avoid: {item.misconception_hint}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // --- LIVE EXAM SIMULATION VIEW ---
  return (
    <div className="flex-1 min-h-0 flex flex-col max-w-[1500px] w-full mx-auto space-y-4 animate-auth-fade">
      {/* Top Exam Navigation Bar */}
      <header className="p-4 rounded-2xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-xl shadow-md flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--flap-primary)]/15 text-[var(--flap-accent)]">
              {quiz.subject_label || 'Science'} Mock Exam
            </span>
            <span className="text-xs text-[var(--flap-mute)] hidden sm:inline">
              Class 7 · {quiz.lesson_title}
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-[var(--flap-ink)] truncate mt-0.5">
            {quiz.title}
          </h2>
        </div>

        {/* Live Timer Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`px-4 py-2 rounded-2xl border font-mono font-bold text-sm tracking-wider flex items-center gap-2 transition-all ${
              timeLeft < 60
                ? 'bg-rose-500/20 text-rose-500 border-rose-500 animate-pulse'
                : isUrgentTime
                ? 'bg-amber-500/20 text-amber-500 border-amber-500'
                : 'bg-[var(--board-steel-elevated)] text-[var(--flap-accent)] border-[var(--board-rule)]'
            }`}
          >
            <span>⏳</span>
            <span>{formatTimer(timeLeft)}</span>
          </div>

          <button
            type="button"
            onClick={() => setConfirmSubmitOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold btn-gradient text-white transition-all cursor-pointer shadow-md"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Main Workspace Split: Question Viewer & Palette */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Active Question Card */}
        <div className="lg:col-span-8 p-6 md:p-8 rounded-3xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-xl shadow-lg flex flex-col justify-between min-h-[500px]">
          <div>
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--board-rule)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--flap-accent)]">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
              <div className="flex items-center gap-2">
                {markedForReview.has(currentQId) && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    ★ Marked for Review
                  </span>
                )}
                <span className="text-xs text-[var(--flap-mute)]">
                  {currentQ?.topic_title || 'General Concept'}
                </span>
              </div>
            </div>

            {/* Question Text */}
            <h3 className="font-[family-name:var(--font-display)] text-base md:text-lg font-bold text-[var(--flap-ink)] leading-relaxed mb-6">
              {currentQ?.prompt}
            </h3>

            {/* Options List */}
            <div className="space-y-3">
              {(currentQ?.options || []).map((opt, optIndex) => {
                const isSelected = answers[currentQId] === opt

                return (
                  <div
                    key={optIndex}
                    onClick={() => handleSelectOption(opt)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 group ${
                      isSelected
                        ? 'border-[var(--flap-accent)] bg-[var(--flap-primary)]/15 shadow-sm'
                        : 'border-[var(--board-rule)] bg-[var(--board-steel-elevated)]/60 hover:bg-[var(--board-steel-elevated)] hover:border-[var(--board-rule-strong)]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'border-[var(--flap-accent)] bg-[var(--flap-accent)] text-white'
                          : 'border-[var(--board-rule-strong)] group-hover:border-[var(--flap-accent)]'
                      }`}
                    >
                      {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm font-medium text-[var(--flap-ink)] leading-normal">
                      {opt}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-6 mt-6 border-t border-[var(--board-rule)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMarkForReview}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  markedForReview.has(currentQId)
                    ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                    : 'bg-[var(--board-steel-elevated)] text-[var(--flap-mute)] hover:text-[var(--flap-ink)] border-[var(--board-rule)]'
                }`}
              >
                {markedForReview.has(currentQId) ? '★ Review Marked' : '☆ Mark for Review'}
              </button>

              {answers[currentQId] && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--flap-mute)] hover:text-rose-500 bg-transparent border-none cursor-pointer"
                >
                  Clear Choice
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--board-steel-elevated)] text-[var(--flap-ink)] hover:bg-[var(--board-steel-card)] border border-[var(--board-rule)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                ← Previous
              </button>

              <button
                type="button"
                onClick={() => {
                  if (currentIndex < totalQuestions - 1) {
                    setCurrentIndex((prev) => prev + 1)
                  } else {
                    setConfirmSubmitOpen(true)
                  }
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold btn-gradient text-white transition-all cursor-pointer shadow-md"
              >
                {currentIndex < totalQuestions - 1 ? 'Save & Next →' : 'Review & Submit'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Question Navigation Palette */}
        <div className="lg:col-span-4 p-6 rounded-3xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-xl shadow-lg space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--board-rule)]">
            <h4 className="font-[family-name:var(--font-display)] text-sm font-bold text-[var(--flap-ink)]">
              Question Palette
            </h4>
            <span className="text-xs text-[var(--flap-mute)]">
              {answeredCount} of {totalQuestions} answered
            </span>
          </div>

          {/* Grid of question buttons */}
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(answers[q.id])
              const isMarked = markedForReview.has(q.id)
              const isCurrent = idx === currentIndex

              let btnClasses = 'border-[var(--board-rule)] bg-[var(--board-steel-elevated)] text-[var(--flap-mute)]'
              if (isAnswered && isMarked) {
                btnClasses = 'border-amber-500 bg-amber-500/20 text-amber-500 font-bold'
              } else if (isAnswered) {
                btnClasses = 'border-emerald-500 bg-emerald-500/20 text-emerald-500 font-bold'
              } else if (isMarked) {
                btnClasses = 'border-amber-500/60 bg-amber-500/10 text-amber-400 font-semibold'
              }

              if (isCurrent) {
                btnClasses += ' ring-2 ring-[var(--flap-accent)] ring-offset-2 ring-offset-[var(--board-steel-card)]'
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-11 rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer border ${btnClasses}`}
                >
                  <span>{idx + 1}</span>
                  {isMarked && <span className="text-[10px] ml-0.5">★</span>}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="pt-4 border-t border-[var(--board-rule)] space-y-2 text-xs">
            <div className="flex items-center justify-between text-[var(--flap-mute)]">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500" />
                <span>Answered</span>
              </span>
              <span className="font-bold text-[var(--flap-ink)]">{answeredCount}</span>
            </div>

            <div className="flex items-center justify-between text-[var(--flap-mute)]">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-amber-500/20 border border-amber-500" />
                <span>Marked for Review</span>
              </span>
              <span className="font-bold text-[var(--flap-ink)]">{reviewCount}</span>
            </div>

            <div className="flex items-center justify-between text-[var(--flap-mute)]">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-[var(--board-steel-elevated)] border border-[var(--board-rule)]" />
                <span>Unattempted</span>
              </span>
              <span className="font-bold text-[var(--flap-ink)]">{totalQuestions - answeredCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Confirmation Modal */}
      {confirmSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-auth-fade">
          <div className="max-w-md w-full p-6 rounded-3xl border border-[var(--board-rule-strong)] bg-[var(--board-steel-card)] shadow-2xl space-y-4">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--flap-ink)]">
              Ready to Submit Your Exam?
            </h3>
            <p className="text-xs text-[var(--flap-mute)] leading-relaxed">
              Once submitted, your answers will be permanently evaluated against curriculum grading criteria and your diagnostic report will be generated.
            </p>

            <div className="p-4 rounded-2xl bg-[var(--board-steel-elevated)] border border-[var(--board-rule)] grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-[10px] text-[var(--flap-mute)] uppercase font-semibold">Answered</p>
                <p className="text-base font-extrabold text-emerald-500 mt-0.5">{answeredCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--flap-mute)] uppercase font-semibold">Review Marked</p>
                <p className="text-base font-extrabold text-amber-500 mt-0.5">{reviewCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--flap-mute)] uppercase font-semibold">Unattempted</p>
                <p className="text-base font-extrabold text-rose-500 mt-0.5">{totalQuestions - answeredCount}</p>
              </div>
            </div>

            {submitError && (
              <p className="text-xs text-[var(--flap-cancel)] font-semibold">{submitError}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSubmitOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-[var(--board-steel-elevated)] text-[var(--flap-ink)] border border-[var(--board-rule)] hover:bg-[var(--board-steel-card)] cursor-pointer"
              >
                Back to Exam
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={performSubmit}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold btn-gradient text-white cursor-pointer shadow-md disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
