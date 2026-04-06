interface ResultBarProps {
  label: string
  count: number
  total: number
  isWinner?: boolean
}

export default function ResultBar({ label, count, total, isWinner }: ResultBarProps) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100)

  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: isWinner ? 600 : 400,
            color: isWinner ? 'var(--color-brand-text)' : 'var(--color-brand-muted)',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: isWinner ? 'var(--color-brand-accent)' : 'var(--color-brand-muted)',
          }}
        >
          {pct}% <span style={{ fontWeight: 400, fontSize: '0.7rem' }}>({count})</span>
        </span>
      </div>
      {/* Track */}
      <div
        style={{
          height: '6px',
          borderRadius: '999px',
          backgroundColor: 'var(--color-brand-surface-2)',
          overflow: 'hidden',
        }}
      >
        {/* Fill */}
        <div
          style={{
            height: '100%',
            borderRadius: '999px',
            width: `${pct}%`,
            background: isWinner
              ? 'linear-gradient(90deg, var(--color-brand-accent), #818cf8)'
              : 'var(--color-brand-surface-2)',
            backgroundColor: isWinner ? undefined : 'var(--color-brand-muted)',
            transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
            opacity: isWinner ? 1 : 0.5,
          }}
        />
      </div>
    </div>
  )
}
