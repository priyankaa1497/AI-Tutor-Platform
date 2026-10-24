import PropTypes from 'prop-types'

const ROLES = [
  { value: 'teacher', label: 'Teacher', icon: '👨‍🏫' },
  { value: 'student', label: 'Student', icon: '🎓' },
]

function RoleToggle({ value, onChange }) {
  return (
    <div className="inline-flex p-1 bg-[var(--board-steel)] backdrop-blur-md rounded-xl border border-[var(--board-rule)] shadow-inner w-full max-w-xs">
      {ROLES.map((role) => {
        const isActive = role.value === value
        return (
          <button
            key={role.value}
            type="button"
            onClick={() => onChange(role.value)}
            className={[
              'flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer border-none',
              isActive
                ? 'btn-gradient font-bold shadow-[0_2px_14px_var(--flap-glow)]'
                : 'bg-transparent text-[var(--flap-mute)] hover:text-[var(--flap-ink)] hover:bg-[var(--board-rule)]/20',
            ].join(' ')}
          >
            <span>{role.icon}</span>
            <span>{role.label}</span>
          </button>
        )
      })}
    </div>
  )
}

RoleToggle.propTypes = {
  value: PropTypes.oneOf(['teacher', 'student']).isRequired,
  onChange: PropTypes.func.isRequired,
}

export default RoleToggle
