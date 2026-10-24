'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  createTeacherQuiz,
  deleteTeacherQuiz,
  fetchQuizAnalytics,
  fetchTeacherCurriculum,
  fetchTeacherMockTests,
  fetchTeacherQuiz,
  publishTeacherQuiz,
} from '../services/api.js'
import { FlapPanel, FlapPanelHead, FlapButton, FlapRow } from './ui/Board.jsx'

export default function TeacherMockTests() {
  const [view, setView] = useState('list') // 'list' | 'create' | 'editor' | 'analytics'
  const [mockTests, setMockTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [curriculum, setCurriculum] = useState(null)
  const [activeTest, setActiveTest] = useState(null)
  const [analytics, setAnalytics] = useState(null)

  const [form, setForm] = useState({
    title: 'Term 1 Board Exam Mock Test',
    grade_key: '',
    grade_id: '',
    subject_id: '',
    lesson_id: '',
    topic_id: '',
    question_count: 5,
    difficulty: 'exam',
    duration_minutes: 20,
    total_marks: 100,
    pass_percentage: 50,
  })

  const loadList = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: err } = await fetchTeacherMockTests()
    setLoading(false)
    if (err) {
      setError(err.message || 'Could not load mock tests.')
      return
    }
    setMockTests(data?.quizzes || [])
  }, [])

  useEffect(() => {
    loadList()
    fetchTeacherCurriculum().then(({ data }) => setCurriculum(data || null))
  }, [loadList])

  const grades = curriculum?.grades || []
  const selectedGrade = grades.find((g) => String(g.key) === String(form.grade_key))
  const boards = selectedGrade?.boards || []
  const selectedBoard =
    boards.find((b) => String(b.id) === String(form.grade_id)) || (boards.length === 1 ? boards[0] : null)
  const subjects = selectedBoard?.subjects || []
  const selectedSubject = subjects.find((s) => String(s.id) === String(form.subject_id))
  const lessons = selectedSubject?.units || []
  const selectedLesson = lessons.find((u) => String(u.id) === String(form.lesson_id))
  const topics = selectedLesson?.topics || []

  const handleGenerate = async () => {
    if (!form.grade_id || !form.subject_id || !form.lesson_id) {
      setError('Please select a grade, subject, and chapter.')
      return
    }

    setBusy(true)
    setError('')

    const payload = {
      title: form.title || 'Standardized Board Exam Mock Test',
      grade_id: Number(form.grade_id),
      grade_label: selectedGrade?.label || 'Class 7',
      subject_id: Number(form.subject_id),
      subject_label: selectedSubject?.label || 'Science',
      curriculum_unit_id: Number(form.lesson_id),
      lesson_title: selectedLesson?.title || 'Comprehensive Unit',
      topic_title: form.topic_id ? topics.find((t) => String(t.id) === String(form.topic_id))?.title : 'Full Syllabus',
      question_count: Number(form.question_count),
      difficulty: form.difficulty,
      quiz_type: 'mock_test',
      duration_minutes: Number(form.duration_minutes),
      total_marks: Number(form.total_marks),
      pass_percentage: Number(form.pass_percentage),
    }

    // 1. Create Mock Test row
    const { data: createdData, error: createErr } = await createTeacherQuiz(payload)
    if (createErr || !createdData?.quiz) {
      setBusy(false)
      setError(createErr?.message || 'Could not initialize mock test.')
      return
    }

    const newQuizId = createdData.quiz.id

    // 2. Generate examination questions via AI
    try {
      await api.post(`/teacher/quizzes/${newQuizId}/questions`, {
        count: Number(form.question_count),
      })
      const { data: fullData } = await fetchTeacherQuiz(newQuizId)
      setBusy(false)
      setActiveTest(fullData?.quiz || createdData.quiz)
      setView('editor')
    } catch (e) {
      setBusy(false)
      const { data: fullData } = await fetchTeacherQuiz(newQuizId)
      setActiveTest(fullData?.quiz || createdData.quiz)
      setView('editor')
    }
  }

  const handlePublish = async (testId) => {
    setBusy(true)
    const { data, error: err } = await publishTeacherQuiz(testId)
    setBusy(false)
    if (err) {
      setError(err.message || 'Could not publish mock test.')
      return
    }
    setView('list')
    loadList()
  }

  const handleDelete = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this mock test?')) return
    setBusy(true)
    await deleteTeacherQuiz(testId)
    setBusy(false)
    loadList()
  }

  const openAnalytics = async (test) => {
    setActiveTest(test)
    setBusy(true)
    const { data } = await fetchQuizAnalytics(test.id)
    setBusy(false)
    setAnalytics(data || null)
    setView('analytics')
  }

  return (
    <div className="space-y-6 animate-auth-fade">
      {/* Header Banner */}
      <header className="p-6 md:p-8 rounded-3xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--flap-primary)]/15 border border-[var(--flap-accent)]/25 text-[var(--flap-accent)] text-xs font-semibold uppercase tracking-wider mb-2">
            <span>⏱️</span>
            <span>Timed Exam Authoring & Proctored Analytics</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-extrabold text-[var(--flap-ink)] m-0">
            Mock Examinations
          </h1>
          <p className="mt-1 text-sm text-[var(--flap-mute)] leading-relaxed">
            Configure simulated exams with strict countdown clocks, negative marking or passing thresholds, and syllabus-wide coverage.
          </p>
        </div>

        {view === 'list' && (
          <button
            type="button"
            onClick={() => {
              setView('create')
              setError('')
            }}
            className="px-5 py-3 rounded-2xl font-bold text-xs btn-gradient text-white transition-all cursor-pointer shadow-lg shrink-0 flex items-center gap-2"
          >
            <span>+ Create Mock Test</span>
          </button>
        )}

        {view !== 'list' && (
          <button
            type="button"
            onClick={() => {
              setView('list')
              setActiveTest(null)
              loadList()
            }}
            className="px-4 py-2.5 rounded-xl font-semibold text-xs bg-[var(--board-steel-elevated)] text-[var(--flap-ink)] border border-[var(--board-rule)] hover:bg-[var(--board-steel-card)] transition-all cursor-pointer shrink-0"
          >
            ← Back to All Tests
          </button>
        )}
      </header>

      {error ? (
        <div className="p-4 rounded-xl border border-[var(--flap-cancel)]/40 bg-[var(--flap-face)] text-sm text-[var(--flap-cancel)]">
          {error}
        </div>
      ) : null}

      {/* VIEW: CREATE MOCK TEST */}
      {view === 'create' && (
        <div className="p-6 md:p-8 rounded-3xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-xl shadow-xl space-y-6">
          <div className="border-b border-[var(--board-rule)] pb-4">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--flap-ink)]">
              Design a Standardized Mock Exam
            </h2>
            <p className="text-xs text-[var(--flap-mute)] mt-1">
              Select curriculum parameters and exam constraints. AI will generate rigorous multiple-choice problems aligned with board standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Title */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--flap-mute)] mb-1.5">
                Exam Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--board-rule)] bg-[var(--board-steel-elevated)] text-sm text-[var(--flap-ink)] focus:border-[var(--flap-accent)] outline-none"
                placeholder="e.g. CBSE Class 7 Mid-Term Science Mock Test"
              />
            </div>

            {/* Grade */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--flap-mute)] mb-1.5">
                Grade / Class
              </label>
              <select
                value={form.grade_key}
                onChange={(e) => {
                  const gKey = e.target.value
                  const g = grades.find((x) => String(x.key) === String(gKey))
                  const b = g?.boards?.[0]
                  setForm({
                    ...form,
                    grade_key: gKey,
                    grade_id: b ? String(b.id) : '',
                    subject_id: '',
                    lesson_id: '',
                    topic_id: '',
                  })
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--board-rule)] bg-[var(--board-steel-elevated)] text-sm text-[var(--flap-ink)] focus:border-[var(--flap-accent)] outline-none"
              >
                <option value="">Select Grade…</option>
                {grades.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Board */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--flap-mute)] mb-1.5">
                Educational Board
              </label>
              <select
                value={form.grade_id}
                onChange={(e) =>
                  setForm({ ...form, grade_id: e.target.value, subject_id: '', lesson_id: '', topic_id: '' })
                }
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--board-rule)] bg-[var(--board-steel-elevated)] text-sm text-[var(--flap-ink)] focus:border-[var(--flap-accent)] outline-none"
              >
                <option value="">Select Board…</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.board}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--flap-mute)] mb-1.5">
                Subject
              </label>
              <select
                value={form.subject_id}
                onChange={(e) => setForm({ ...form, subject_id: e.target.value, lesson_id: '', topic_id: '' })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--board-rule)] bg-[var(--board-steel-elevated)] text-sm text-[var(--flap-ink)] focus:border-[var(--flap-accent)] outline-none"
              >
                <option value="">Select Subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Lesson / Chapter */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--flap-mute)] mb-1.5">
                Curriculum Chapter / Unit
              </label>
              <select
                value={form.lesson_id}
                onChange={(e) => setForm({ ...form, lesson_id: e.target.value, topic_id: '' })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--board-rule)] bg-[var(--board-steel-elevated)] text-sm text-[var(--flap-ink)] focus:border-[var(--flap-accent)] outline-none"
              >
                <option value="">Select Chapter…</option>
                {lessons.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--flap-mute)] mb-1.5">
                Exam Duration (Minutes)
              </label>
              <select
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--board-rule)] bg-[var(--board-steel-elevated)] text-sm text-[var(--flap-ink)] focus:border-[var(--flap-accent)] outline-none"
              >
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>

            {/* Question count */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--flap-mute)] mb-1.5">
                Number of Questions
              </label>
              <select
                value={form.question_count}
                onChange={(e) => setForm({ ...form, question_count: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--board-rule)] bg-[var(--board-steel-elevated)] text-sm text-[var(--flap-ink)] focus:border-[var(--flap-accent)] outline-none"
              >
                <option value={4}>4 Questions (Quick Mock)</option>
                <option value={6}>6 Questions (Standard)</option>
                <option value={10}>10 Questions (Mid-Term)</option>
                <option value={15}>15 Questions (Full Board Paper)</option>
              </select>
            </div>

            {/* Total Marks */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--flap-mute)] mb-1.5">
                Total Marks
              </label>
              <select
                value={form.total_marks}
                onChange={(e) => setForm({ ...form, total_marks: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--board-rule)] bg-[var(--board-steel-elevated)] text-sm text-[var(--flap-ink)] focus:border-[var(--flap-accent)] outline-none"
              >
                <option value={50}>50 Marks</option>
                <option value={100}>100 Marks</option>
                <option value={200}>200 Marks</option>
              </select>
            </div>

            {/* Pass % */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--flap-mute)] mb-1.5">
                Passing Threshold
              </label>
              <select
                value={form.pass_percentage}
                onChange={(e) => setForm({ ...form, pass_percentage: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--board-rule)] bg-[var(--board-steel-elevated)] text-sm text-[var(--flap-ink)] focus:border-[var(--flap-accent)] outline-none"
              >
                <option value={40}>40% (Minimum Pass)</option>
                <option value={50}>50% (Standard Pass)</option>
                <option value={60}>60% (First Class)</option>
                <option value={75}>75% (Distinction Bar)</option>
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--flap-mute)] mb-1.5">
                Standard / Rigor
              </label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--board-rule)] bg-[var(--board-steel-elevated)] text-sm text-[var(--flap-ink)] focus:border-[var(--flap-accent)] outline-none"
              >
                <option value="exam">Board Exam Standard</option>
                <option value="intermediate">Moderate Assessment</option>
                <option value="deep">Competitive / Olympiad Level</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--board-rule)] flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setView('list')}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[var(--flap-mute)] hover:text-[var(--flap-ink)] bg-transparent border border-[var(--board-rule)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleGenerate}
              className="px-6 py-2.5 rounded-xl text-xs font-bold btn-gradient text-white shadow-lg cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <span>{busy ? 'Generating Board Exam Paper…' : 'Generate Mock Test Questions ⚡'}</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW: DRAFT EDITOR */}
      {view === 'editor' && activeTest && (
        <div className="p-6 md:p-8 rounded-3xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-xl shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--board-rule)]">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--flap-accent)]">
                {activeTest.status === 'published' ? 'Published Examination' : 'Draft Examination'}
              </span>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--flap-ink)] mt-0.5">
                {activeTest.title}
              </h2>
              <p className="text-xs text-[var(--flap-mute)] mt-0.5">
                ⏱️ {activeTest.duration_minutes || 20}m duration · 🏆 {activeTest.total_marks || 100} Marks · 📝 {activeTest.questions?.length || 0} Questions
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {activeTest.status !== 'published' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handlePublish(activeTest.id)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold btn-gradient text-white cursor-pointer shadow-md"
                >
                  Publish to Students 🚀
                </button>
              )}
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-4">
            {(activeTest.questions || []).map((q, idx) => (
              <div
                key={q.id || idx}
                className="p-5 rounded-2xl border border-[var(--board-rule)] bg-[var(--board-steel-elevated)]/60 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--flap-accent)]">
                    Question {idx + 1}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                    Answer: {q.correct_answer}
                  </span>
                </div>

                <p className="text-sm font-semibold text-[var(--flap-ink)]">{q.prompt}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {(q.options || []).map((opt, optIdx) => {
                    const isCorrect = q.correct_answer === opt || opt.startsWith(q.correct_answer + '.')
                    return (
                      <div
                        key={optIdx}
                        className={`p-2.5 rounded-xl border ${
                          isCorrect
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500 font-semibold'
                            : 'border-[var(--board-rule)] bg-[var(--board-steel-card)] text-[var(--flap-mute)]'
                        }`}
                      >
                        {opt}
                      </div>
                    )
                  })}
                </div>

                {q.explanation && (
                  <p className="text-xs text-[var(--flap-mute)] pt-2 border-t border-[var(--board-rule)]">
                    <strong className="text-[var(--flap-ink)]">Explanation:</strong> {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: ANALYTICS MODAL/PANEL */}
      {view === 'analytics' && activeTest && (
        <div className="p-6 md:p-8 rounded-3xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-xl shadow-xl space-y-6">
          <div className="pb-4 border-b border-[var(--board-rule)] flex items-center justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--flap-ink)]">
                Performance Analytics: {activeTest.title}
              </h2>
              <p className="text-xs text-[var(--flap-mute)] mt-0.5">
                Aggregated cohort performance under exam simulation conditions
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView('list')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[var(--board-steel-elevated)] border border-[var(--board-rule)] cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--board-steel-elevated)] border border-[var(--board-rule)] text-center">
              <p className="text-[10px] text-[var(--flap-mute)] uppercase font-semibold">Total Attempts</p>
              <p className="text-2xl font-black text-[var(--flap-ink)] mt-1">{analytics?.total_attempted || 0}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--board-steel-elevated)] border border-[var(--board-rule)] text-center">
              <p className="text-[10px] text-[var(--flap-mute)] uppercase font-semibold">Completed</p>
              <p className="text-2xl font-black text-emerald-500 mt-1">{analytics?.total_completed || 0}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--board-steel-elevated)] border border-[var(--board-rule)] text-center">
              <p className="text-[10px] text-[var(--flap-mute)] uppercase font-semibold">Average Score</p>
              <p className="text-2xl font-black text-[var(--flap-accent)] mt-1">
                {analytics?.average_score != null ? `${analytics.average_score}%` : '—'}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--board-steel-elevated)] border border-[var(--board-rule)] text-center">
              <p className="text-[10px] text-[var(--flap-mute)] uppercase font-semibold">Highest Score</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {analytics?.highest_score != null ? `${analytics.highest_score}%` : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: LIST OF MOCK TESTS */}
      {view === 'list' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-[var(--flap-mute)] font-[family-name:var(--font-flap)] text-sm uppercase tracking-widest">
              Loading mock tests…
            </div>
          ) : null}

          {!loading && mockTests.length === 0 ? (
            <FlapPanel className="p-10 text-center">
              <p className="text-3xl mb-3">⏱️</p>
              <p className="font-[family-name:var(--font-flap)] text-sm uppercase tracking-wider text-[var(--flap-mute)] mb-1">
                No mock tests configured yet
              </p>
              <p className="text-xs text-[var(--flap-mute)] max-w-sm mx-auto mb-4">
                Click "+ Create Mock Test" above to generate a curriculum-calibrated exam with time limits and diagnostic grading.
              </p>
              <button
                type="button"
                onClick={() => setView('create')}
                className="px-4 py-2 rounded-xl text-xs font-bold btn-gradient text-white cursor-pointer"
              >
                Create First Mock Test
              </button>
            </FlapPanel>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {mockTests.map((t) => (
              <div
                key={t.id}
                className="p-6 rounded-3xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] hover:border-[var(--board-rule-strong)] transition-all shadow-md flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[var(--flap-primary)]/15 text-[var(--flap-accent)] border border-[var(--flap-accent)]/20">
                        {t.subject_label || 'Science'}
                      </span>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-[var(--board-steel-elevated)] text-[var(--flap-mute)] border border-[var(--board-rule)]">
                        {t.grade_label || 'Class 7'}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        t.status === 'published'
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/25'
                          : 'bg-amber-500/15 text-amber-500 border border-amber-500/25'
                      }`}
                    >
                      {t.status === 'published' ? 'Active & Published' : 'Draft'}
                    </span>
                  </div>

                  <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--flap-ink)] group-hover:text-[var(--flap-accent)] transition-colors mb-1.5">
                    {t.title}
                  </h3>
                  <p className="text-xs text-[var(--flap-mute)] mb-4">
                    {t.lesson_title} {t.topic_title ? `· ${t.topic_title}` : ''}
                  </p>

                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[var(--board-steel-elevated)]/60 border border-[var(--board-rule)] text-center mb-5">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-[var(--flap-mute)]">Duration</p>
                      <p className="text-sm font-bold text-[var(--flap-ink)] mt-0.5">⏱️ {t.duration_minutes || 20}m</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-[var(--flap-mute)]">Questions</p>
                      <p className="text-sm font-bold text-[var(--flap-ink)] mt-0.5">📝 {t.question_count || 5} Qs</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-[var(--flap-mute)]">Marks</p>
                      <p className="text-sm font-bold text-[var(--flap-accent)] mt-0.5">🏆 {t.total_marks || 100} M</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[var(--board-rule)]">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTest(t)
                      setView('editor')
                    }}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-[var(--board-steel-elevated)] text-[var(--flap-ink)] hover:bg-[var(--board-steel-card)] border border-[var(--board-rule)] transition-all cursor-pointer"
                  >
                    View Paper 📄
                  </button>

                  <button
                    type="button"
                    onClick={() => openAnalytics(t)}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-[var(--board-steel-elevated)] text-[var(--flap-accent)] hover:bg-[var(--board-steel-card)] border border-[var(--board-rule)] transition-all cursor-pointer"
                  >
                    Analytics 📊
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    className="p-2 rounded-xl text-xs font-semibold text-[var(--flap-mute)] hover:text-rose-500 bg-transparent border-none cursor-pointer"
                    title="Delete Mock Test"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
