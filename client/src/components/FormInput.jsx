import PropTypes from 'prop-types'

function FormInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  as = 'input',
  options,
  ...rest
}) {
  const id = rest.id ?? name

  const baseInput =
    `w-full rounded-xl border px-3.5 py-2.5 text-sm font-sans bg-[var(--board-steel-elevated)] text-[var(--flap-ink)] placeholder:text-[var(--flap-mute)] ` +
    `transition-all duration-200 outline-none backdrop-blur-md ` +
    `focus:border-[var(--flap-accent)] focus:ring-2 focus:ring-[var(--flap-glow)] ` +
    (error ? 'border-red-500/80 bg-red-500/5' : 'border-[var(--board-rule)] hover:border-[var(--board-rule-strong)]')

  if (as === 'select') {
    return (
      <div className="grid gap-1.5 min-w-0">
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-[var(--flap-mute)]">{label}</label>
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          className={`${baseInput} min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer`}
          style={{ minWidth: 0 }}
          {...rest}
        >
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[var(--board-steel-elevated)] text-[var(--flap-ink)]">{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400 mt-0.5 font-medium">{error}</p>}
      </div>
    )
  }

  if (as === 'select-multiple') {
    return (
      <div className="grid gap-1.5">
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-[var(--flap-mute)]">{label}</label>
        <select id={id} name={name} multiple value={value} onChange={onChange}
          className={`${baseInput} min-h-[3.8rem] cursor-pointer`} {...rest}>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[var(--board-steel-elevated)] text-[var(--flap-ink)] py-1">{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400 mt-0.5 font-medium">{error}</p>}
      </div>
    )
  }

  return (
    <div className="grid gap-1.5" suppressHydrationWarning>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-[var(--flap-mute)]">{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={baseInput}
        suppressHydrationWarning
        autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : undefined}
        {...rest}
      />
      {error && <p className="text-xs text-red-400 mt-0.5 font-medium">{error}</p>}
    </div>
  )
}

FormInput.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  type: PropTypes.string,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  as: PropTypes.oneOf(['input', 'select', 'select-multiple']),
  options: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ),
}

export default FormInput
