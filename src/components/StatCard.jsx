import { formatCurrency } from '../utils/format'

export default function StatCard({ label, value, sub, variant = 'default' }) {
  return (
    <div className={`stat-card stat-card--${variant}`}>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">
        {typeof value === 'number' ? formatCurrency(value) : value}
      </span>
      {sub && <span className="stat-card__sub">{sub}</span>}
    </div>
  )
}
