interface DomainBadgeProps {
  domain: string
}

export default function DomainBadge({ domain }: DomainBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.15rem 0.5rem',
        borderRadius: '999px',
        fontSize: '0.68rem',
        fontWeight: 600,
        color: 'var(--color-brand-accent)',
        backgroundColor: 'var(--color-brand-accent-muted)',
        border: '1px solid #6366f133',
        fontFamily: 'monospace',
      }}
    >
      @{domain}
    </span>
  )
}
