import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext.jsx'

export default function ThemeSwitcher({ className = '', dropUp = false }) {
  const { theme, setTheme, mode, toggleMode, setMode, currentThemeMeta, themes } = useTheme()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`} ref={menuRef}>
      {/* Clear Dual Segmented Dark / Light Mode Controls */}
      <div className="flex items-center p-0.5 rounded-xl border border-[var(--board-rule)] bg-[var(--board-steel-elevated)]/80 backdrop-blur-xl shadow-sm">
        <button
          type="button"
          onClick={() => setMode('dark')}
          title="Switch to Dark Mode"
          aria-label="Dark Mode"
          className={[
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer border',
            mode === 'dark'
              ? 'bg-[var(--flap-primary)]/20 text-[var(--flap-ink)] border-[var(--flap-accent)]/50 shadow-sm font-bold'
              : 'border-transparent text-[var(--flap-mute)] hover:text-[var(--flap-ink)] hover:bg-[var(--board-rule)]/20',
          ].join(' ')}
        >
          <span>🌙</span>
          <span className="hidden sm:inline">Dark</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('light')}
          title="Switch to Light Mode"
          aria-label="Light Mode"
          className={[
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer border',
            mode === 'light'
              ? 'bg-[var(--flap-primary)]/20 text-[var(--flap-ink)] border-[var(--flap-accent)]/50 shadow-sm font-bold'
              : 'border-transparent text-[var(--flap-mute)] hover:text-[var(--flap-ink)] hover:bg-[var(--board-rule)]/20',
          ].join(' ')}
        >
          <span>☀️</span>
          <span className="hidden sm:inline">Light</span>
        </button>
      </div>

      {/* Theme Palette Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Switch Design Theme"
        aria-expanded={open}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--board-rule)] bg-[var(--board-steel-elevated)]/80 hover:bg-[var(--board-steel-elevated)] hover:border-[var(--flap-accent)]/50 backdrop-blur-xl text-xs font-semibold text-[var(--flap-ink)] shadow-md transition-all duration-200 cursor-pointer group"
      >
        <span className="flex items-center justify-center w-4 h-4 text-xs">
          {currentThemeMeta.icon}
        </span>
        <span className="hidden sm:inline font-[family-name:var(--font-display)] tracking-wide">
          {currentThemeMeta.name}
        </span>
        <span
          className="w-2 h-2 rounded-full shadow-sm"
          style={{
            backgroundColor: currentThemeMeta.primary,
            boxShadow: `0 0 8px ${currentThemeMeta.primary}`,
          }}
        />
        <svg
          className={`w-3.5 h-3.5 text-[var(--flap-mute)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div
          className={[
            'absolute right-0 z-50 w-72 p-2.5 rounded-2xl border border-[var(--board-rule-strong)] bg-[var(--board-steel-card)] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] animate-auth-fade',
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2',
          ].join(' ')}
        >
          {/* Dark / Light Mode Segmented Control */}
          <div className="p-1 mb-2.5 rounded-xl border border-[var(--board-rule)] bg-[var(--board-steel)] flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMode('dark')}
              className={[
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-180 border-none cursor-pointer',
                mode === 'dark'
                  ? 'bg-[var(--board-steel-elevated)] text-[var(--flap-ink)] shadow-sm font-bold border border-[var(--board-rule)]'
                  : 'text-[var(--flap-mute)] hover:text-[var(--flap-ink)]',
              ].join(' ')}
            >
              <span>🌙</span>
              <span>Dark</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('light')}
              className={[
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-180 border-none cursor-pointer',
                mode === 'light'
                  ? 'bg-[var(--board-steel-elevated)] text-[var(--flap-ink)] shadow-sm font-bold border border-[var(--board-rule)]'
                  : 'text-[var(--flap-mute)] hover:text-[var(--flap-ink)]',
              ].join(' ')}
            >
              <span>☀️</span>
              <span>Light</span>
            </button>
          </div>

          <div className="px-2 py-1 border-b border-[var(--board-rule)] mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--flap-mute)] font-[family-name:var(--font-display)]">
              Inspo Archetypes
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--board-rule)] text-[var(--flap-accent)] font-mono">
              Live
            </span>
          </div>

          <div className="space-y-1">
            {themes.map((t) => {
              const isSelected = t.id === theme
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id)
                    setOpen(false)
                  }}
                  className={[
                    'w-full flex items-center justify-between p-2 rounded-xl text-left transition-all duration-180 cursor-pointer border',
                    isSelected
                      ? 'bg-[var(--flap-primary)]/15 border-[var(--flap-accent)]/50 text-[var(--flap-ink)] shadow-sm'
                      : 'border-transparent text-[var(--flap-ink)] hover:bg-black/5 dark:hover:bg-white/[0.04] hover:border-black/5 dark:hover:border-white/[0.08]',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">{t.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight truncate text-[var(--flap-ink)]">
                        {t.name}
                      </p>
                      <p className="text-[10px] text-[var(--flap-mute)] leading-tight truncate">
                        {t.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Color Swatch Dots */}
                    <div className="flex items-center -space-x-1">
                      <span
                        className="w-3 h-3 rounded-full border border-black/30"
                        style={{ backgroundColor: t.primary }}
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-black/30"
                        style={{ backgroundColor: t.accent }}
                      />
                    </div>
                    {isSelected && (
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: t.primary }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
