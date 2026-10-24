import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { fetchTeacherProfile, submitTeacherOnboarding } from '../services/api.js'
import AvatarUploader from '../components/AvatarUploader.jsx'
import ProgressBar from './onboarding/ProgressBar.jsx'
import Step1ContentSetup from './onboarding/Step1ContentSetup.jsx'
import Step2TeachingStyle from './onboarding/Step2TeachingStyle.jsx'

function TeacherOnboarding() {
    const [searchParams] = useSearchParams()
    const startAtStep2 = searchParams.get('step') === '2'
    const [step, setStep] = useState(() => (startAtStep2 ? 2 : 1))
    const [formData, setFormData] = useState({})
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [profileLoaded, setProfileLoaded] = useState(!startAtStep2)
    const { user, updateUser, logout } = useAuth()
    const navigate = useNavigate()
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '')

    useEffect(() => {
        if (!startAtStep2) return
        let cancelled = false
        ;(async () => {
            const { data, error } = await fetchTeacherProfile()
            if (cancelled || error) {
                setProfileLoaded(true)
                return
            }
            const p = data?.profile
            if (p) {
                setFormData({
                    upload_preference: p.upload_preference || 'both',
                    grades: Array.isArray(p.grades) ? p.grades : [],
                    subjects: Array.isArray(p.subjects) ? p.subjects : [],
                    number_of_syllabi: p.number_of_syllabi ?? null,
                    number_of_materials: p.number_of_materials ?? null,
                })
                if (p.avatar_url) setAvatarUrl(p.avatar_url)
            }
            setProfileLoaded(true)
        })()
        return () => {
            cancelled = true
        }
    }, [startAtStep2])

    const handleStep1Next = (step1Data) => {
        setFormData(prev => ({ ...prev, ...step1Data }))
        setStep(2)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleStep2Submit = async (step2Data) => {
        const { audioBlob, mimeType } = step2Data
        const form = new FormData()
        form.append('upload_preference', formData.upload_preference)
        form.append('grades', JSON.stringify(formData.grades))
        form.append('subjects', JSON.stringify(formData.subjects))
        if (formData.number_of_syllabi != null) {
            form.append('number_of_syllabi', String(formData.number_of_syllabi))
        }
        if (formData.number_of_materials != null) {
            form.append('number_of_materials', String(formData.number_of_materials))
        }
        const mt = (mimeType || '').toLowerCase()
        const ext = mt.includes('wav')
            ? 'wav'
            : mt.includes('mp3')
                ? 'mp3'
                : mt.includes('m4a')
                    ? 'm4a'
                    : mt.includes('ogg')
                        ? 'ogg'
                        : mt.includes('mp4')
                            ? 'mp4'
                            : 'webm'
        form.append('audio', audioBlob, `teaching-sample.${ext}`)
        form.append('language', 'en')

        setSubmitting(true)
        setSubmitError('')
        const { error } = await submitTeacherOnboarding(form)
        setSubmitting(false)

        if (error) {
            setSubmitError(error.message || 'Something went wrong. Please try again.')
            return
        }

        // Update auth state so ProtectedRoute won't redirect back
        updateUser({ onboarding_completed: true })
        if (startAtStep2) {
            if (typeof window !== 'undefined') sessionStorage.setItem('teacherActiveTab', 'tune')
            navigate('/teacher', { replace: true })
        } else {
            navigate('/onboarding-complete', { replace: true })
        }
    }

    return (
        <div className="min-h-[100dvh] flex items-center justify-center p-4 md:p-8 bg-[var(--board-steel-deep)] relative overflow-hidden">
            {/* Ambient glows - Supaste Cobalt Aura */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-sky-500/15 rounded-full blur-[130px] pointer-events-none" />

            <div className="w-full max-w-[1080px] grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-8 items-stretch relative z-10 animate-auth-fade my-6">
                <aside className="hidden lg:flex flex-col justify-between p-10 rounded-2xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--flap-primary)]/15 border border-[var(--flap-accent)]/30 text-[var(--flap-accent)] text-xs font-semibold tracking-wide uppercase mb-6 shadow-sm">
                            <span>🎙️</span>
                            AI Voice Calibration
                        </div>

                        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--flap-ink)] leading-tight tracking-tight mb-4">
                            Build Your AI Teaching Identity
                        </h1>

                        <p className="text-[var(--flap-mute)] text-sm leading-relaxed mb-8">
                            This isn&apos;t just a standard profile form. You are calibrating your personal AI model so it adopts your exact pedagogy, vocabulary, and explanation pace.
                        </p>

                        <div className="space-y-4">
                            {[
                                { mark: '01', title: 'Content & Subjects', text: 'Select curricula, grades, and subjects you specialize in.' },
                                { mark: '02', title: 'Voice & Pedagogy Sample', text: 'Read a short 35s teaching prompt to capture your cadence.' },
                                { mark: '03', title: 'Neural Model Tuning', text: 'AI assigns your detected teaching style and clones your voice.' },
                            ].map((item, i) => (
                                <div key={i} className={['p-3.5 rounded-xl border transition-all duration-300', step > i ? 'bg-[var(--flap-primary)]/15 border-[var(--flap-accent)]/40 text-[var(--flap-ink)] shadow-sm' : 'bg-[var(--board-steel-elevated)]/60 border-[var(--board-rule)] opacity-60 text-[var(--flap-mute)]'].join(' ')}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-[var(--flap-accent)] tabular-nums">{item.mark}</span>
                                        <p className="text-xs font-bold uppercase tracking-wider">{item.title}</p>
                                    </div>
                                    <p className="text-xs text-[var(--flap-mute)]">{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10 pt-6 border-t border-[var(--board-rule)]">
                        <p className="text-xs text-[var(--flap-mute)]">
                            LearnAI Teacher Protocol · Privacy Preserved
                        </p>
                    </div>
                </aside>

                <div className="p-8 md:p-10 rounded-2xl border border-[var(--board-rule)] bg-[var(--board-steel-card)] backdrop-blur-2xl shadow-2xl overflow-y-auto">
                    <header className="mb-6 flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[var(--btn-gradient-from)] to-[var(--btn-gradient-to)] flex items-center justify-center font-bold text-white text-xs shadow-sm">L</div>
                                <span className="font-[family-name:var(--font-display)] font-bold text-base text-[var(--flap-ink)]">LearnAI Studio</span>
                            </div>
                            <p className="text-xs text-[var(--flap-mute)]">
                                {startAtStep2 ? 'Recalibrate your voice sample' : 'Teacher Onboarding — Step ' + step + ' of 2'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={logout}
                            className="text-xs text-[var(--flap-mute)] hover:text-[var(--flap-accent)] transition-colors border-none bg-transparent cursor-pointer font-medium"
                        >
                            Sign out
                        </button>
                    </header>

                    <div className="mb-6">
                        <AvatarUploader
                            displayName={user?.name || 'Teacher'}
                            initialUrl={avatarUrl}
                            onUploaded={(url) => {
                                setAvatarUrl(url)
                                updateUser?.({ avatar_url: url })
                            }}
                        />
                    </div>

                    <div className="mb-6">
                        <ProgressBar current={step} />
                    </div>

                    {submitError && (
                        <div className="mb-5 p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-xs">
                            {submitError}
                        </div>
                    )}

                    {step === 1 && (
                        <Step1ContentSetup data={formData} onNext={handleStep1Next} />
                    )}
                    {step === 2 && (!startAtStep2 || profileLoaded) && (
                        <Step2TeachingStyle
                            onBack={() => {
                                if (startAtStep2) {
                                    if (typeof window !== 'undefined') sessionStorage.setItem('teacherActiveTab', 'tune')
                                    navigate('/teacher', { replace: true })
                                    return
                                }
                                setStep(1)
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            onSubmit={handleStep2Submit}
                            submitting={submitting}
                        />
                    )}
                    {step === 2 && startAtStep2 && !profileLoaded && (
                        <div className="py-12 text-center text-slate-400 text-sm">
                            <span className="spinner mr-2" /> Loading teacher profile...
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default TeacherOnboarding
