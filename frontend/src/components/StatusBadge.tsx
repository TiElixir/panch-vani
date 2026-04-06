interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | string
}

const config: Record<string, { label: string; color: string; bg: string }> = {
  approved: { label: 'Approved', color: 'var(--color-brand-success)', bg: '#10b98122' },
  pending:  { label: 'Pending',  color: 'var(--color-brand-warning)', bg: '#f59e0b22' },
  rejected: { label: 'Rejected', color: 'var(--color-brand-danger)',  bg: '#ef444422' },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, color, bg } = config[status] ?? {
    label: status, color: 'var(--color-brand-muted)', bg: 'transparent',
  }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.2rem 0.625rem',
        borderRadius: '999px',
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color,
        backgroundColor: bg,
        border: `1px solid ${color}44`,
      }}
    >
      {label}
    </span>
  )
}
