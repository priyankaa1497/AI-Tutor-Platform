'use client'

import React from 'react'
import ThemeSwitcher from '../ThemeSwitcher.jsx'

/** Split-flap board primitives & multi-theme design system components — LearnAI */

export function BoardShell({ children, className = '', viewport = false }) {
  return (
    <div
      className={[
        'board-frame bg-[var(--board-steel-deep)] text-[var(--flap-ink)] selection:bg-[var(--flap-primary)] selection:text-[var(--btn-text)]',
        viewport ? 'h-[100dvh] max-h-[100dvh] flex flex-col overflow-x-clip min-h-0' : 'min-h-[100dvh] flex flex-col',
        className,
      ].join(' ')}
    >
      <div className="board-frame__rail board-frame__rail--top" aria-hidden />
      <div className="flex-1 flex flex-col min-h-0 relative z-[1]">{children}</div>
      <div className="board-frame__rail board-frame__rail--bottom" aria-hidden />
    </div>
  )
}

export function BoardHeader({ brand, sub, children, actions }) {
  return (
    <header className="shrink-0 border-b border-[var(--board-rule)] bg-[var(--board-steel-deep)]/90 backdrop-blur-xl sticky top-0 z-30 transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-5 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, var(--btn-gradient-from), var(--btn-gradient-to))',
                color: 'var(--btn-text)',
                boxShadow: '0 0 16px var(--flap-glow)',
              }}
            >
              L
            </div>
            <div className="leading-tight min-w-0">
              {typeof brand === 'string' || typeof brand === 'number' ? (
                <p className="font-[family-name:var(--font-display)] text-base font-bold tracking-tight text-[var(--flap-ink)] truncate flex items-center gap-1.5">
                  {brand}
                </p>
              ) : (
                brand
              )}
              {sub ? (
                <p
                  className="font-[family-name:var(--font-body)] text-[11px] font-medium tracking-wide uppercase truncate transition-colors duration-300"
                  style={{ color: 'var(--flap-accent)' }}
                >
                  {sub}
                </p>
              ) : null}
            </div>
          </div>
          {children}
        </div>
        
        {/* Right side actions with integrated theme switcher */}
        <div className="flex items-center gap-2.5 shrink-0">
          <ThemeSwitcher />
          {actions}
        </div>
      </div>
    </header>
  )
}

export function FlapTab({ active, onClick, children, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={
        active
          ? {
              background: 'linear-gradient(135deg, var(--btn-gradient-from), var(--btn-gradient-to))',
              color: 'var(--btn-text)',
              borderColor: 'var(--flap-accent)',
              boxShadow: '0 0 18px var(--flap-glow)',
            }
          : {}
      }
      className={[
        'font-[family-name:var(--font-display)] px-3.5 py-1.5 text-xs md:text-sm font-semibold tracking-wide rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 border',
        active
          ? 'font-bold'
          : 'bg-white/[0.03] text-[var(--flap-mute)] border-white/[0.06] hover:text-[var(--flap-ink)] hover:bg-white/[0.06] hover:border-white/[0.12]',
      ].join(' ')}
    >
      <span>{children}</span>
      {badge ? (
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            active ? 'bg-black/25 text-white font-extrabold' : 'bg-white/10 text-white/90'
          }`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  )
}

export function FlapRow({
  cols = [],
  amber = false,
  cancelled = false,
  selected = false,
  onClick,
  className = '',
  as: Tag = onClick ? 'button' : 'div',
  lamp = false,
}) {
  const base =
    'w-full grid items-center gap-x-3 px-3 py-2.5 rounded-lg border text-left transition-all duration-200'
  const tone = cancelled
    ? 'text-[var(--flap-cancel)] border-red-500/20 bg-red-500/5'
    : amber
      ? 'text-[var(--flap-accent)] border-[var(--board-rule)] bg-[var(--flap-primary)]/10'
      : selected
        ? 'bg-[var(--flap-primary)]/15 text-[var(--flap-ink)] border-[var(--flap-accent)]/40 shadow-[0_0_16px_var(--flap-glow)]'
        : 'text-[var(--flap-ink)] border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]'
  return (
    <Tag
      type={Tag === 'button' ? 'button' : undefined}
      onClick={onClick}
      className={[base, tone, onClick ? 'cursor-pointer' : '', className].join(' ')}
      style={{
        gridTemplateColumns: [
          lamp || amber ? '12px' : null,
          ...cols.map((c) => c.width || '1fr'),
        ]
          .filter(Boolean)
          .join(' '),
      }}
    >
      {(lamp || amber) && (
        <span
          className={['flap-lamp', cancelled ? 'flap-lamp--cancel' : amber ? 'flap-lamp--amber' : selected ? 'flap-lamp--amber' : ''].join(' ')}
          aria-hidden
        />
      )}
      {cols.map((c, i) => (
        <span
          key={i}
          className={[
            'tracking-normal truncate px-1 py-0.5',
            c.mute ? 'text-[var(--flap-mute)]' : '',
            c.className || '',
            i === 0 ? 'text-xs md:text-sm font-semibold' : 'text-xs font-medium text-[var(--flap-mute)]',
          ].join(' ')}
        >
          {c.label}
        </span>
      ))}
    </Tag>
  )
}

export function FlapPanel({ children, className = '', scroll = false }) {
  return (
    <section
      className={[
        'glass-card overflow-hidden',
        scroll ? 'flex flex-col min-h-0' : '',
        className,
      ].join(' ')}
    >
      {children}
    </section>
  )
}

export function FlapPanelHead({ title, meta, icon }) {
  return (
    <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--board-rule)] bg-[var(--board-steel-elevated)]/60">
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-[var(--flap-accent)] shrink-0">{icon}</span>}
        <h2 className="font-[family-name:var(--font-display)] text-xs md:text-sm font-bold tracking-wider uppercase text-[var(--flap-ink)] m-0 truncate">
          {title}
        </h2>
      </div>
      {meta ? (
        <span className="font-[family-name:var(--font-body)] text-xs font-semibold text-[var(--flap-accent)] px-2 py-0.5 rounded-full bg-[var(--flap-primary)]/10 border border-[var(--board-rule)]">
          {meta}
        </span>
      ) : null}
    </div>
  )
}

export function FlapButton({ children, onClick, variant = 'primary', disabled, className = '', type = 'button' }) {
  const styles = {
    primary: 'btn-gradient font-bold shadow-[0_4px_18px_var(--flap-glow)]',
    amber: 'btn-gradient font-bold shadow-[0_4px_18px_var(--flap-glow)]',
    ghost: 'bg-white/[0.04] text-[var(--flap-ink)] border border-[var(--board-rule)] hover:bg-white/[0.08] hover:border-[var(--board-rule-strong)]',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20',
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={[
        'font-[family-name:var(--font-body)] px-4 py-2 text-xs md:text-sm font-semibold rounded-xl border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2',
        styles[variant] || styles.primary,
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function FlapInput({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={[
        'w-full rounded-xl bg-[var(--board-steel-elevated)]/80 text-[var(--flap-ink)] border border-[var(--board-rule)] px-3.5 py-2.5 text-sm outline-none transition-all duration-200 focus:border-[var(--flap-accent)] focus:ring-2 focus:ring-[var(--flap-glow)] placeholder:text-neutral-500',
        'font-[family-name:var(--font-body)]',
        className,
      ].join(' ')}
    />
  )
}

export function IconBell({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9a6 6 0 1 1 12 0c0 3.5 1.5 5 2 6H4c.5-1 2-2.5 2-6Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconLogout({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 12h10M10 8l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconSparkles({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
    </svg>
  )
}
