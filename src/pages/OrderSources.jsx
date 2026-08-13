import { useCallback, useEffect, useState } from 'react'
import { orderSourcesApi } from '../api/services'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { ORDER_SOURCES } from '../config'
import { formatCurrency, formatDate, todayISO } from '../utils/format'

export default function OrderSources() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    date: todayISO(),
    source: 'foodpanda',
    order_count: '1',
    revenue: '',
    notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await orderSourcesApi.list())
    } catch {
      setError('Failed to load order sources. Is the API running?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      await orderSourcesApi.create({
        date: form.date,
        source: form.source,
        order_count: Number(form.order_count),
        revenue: Number(form.revenue),
        notes: form.notes,
      })
      setForm({
        date: todayISO(),
        source: 'foodpanda',
        order_count: '1',
        revenue: '',
        notes: '',
      })
      load()
    } catch {
      setError('Failed to save. Check API connection.')
    }
  }

  async function handleDelete(id) {
    try {
      await orderSourcesApi.delete(id)
      load()
    } catch {
      setError('Failed to delete record.')
    }
  }

  const sourceLabel = (id) => ORDER_SOURCES.find((s) => s.id === id)?.label ?? id
  const sourceType = (id) => ORDER_SOURCES.find((s) => s.id === id)?.type ?? ''

  const columns = [
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    {
      key: 'source',
      label: 'Source',
      render: (r) => (
        <span>
          {sourceLabel(r.source)}{' '}
          <span className={`tag tag--${sourceType(r.source)}`}>{sourceType(r.source)}</span>
        </span>
      ),
    },
    { key: 'order_count', label: 'Orders' },
    { key: 'revenue', label: 'Revenue', render: (r) => formatCurrency(r.revenue) },
    { key: 'notes', label: 'Notes' },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleDelete(r.id)}>
          Delete
        </button>
      ),
    },
  ]

  const appTotal = items
    .filter((i) => sourceType(i.source) === 'app')
    .reduce((s, i) => s + (i.order_count || 0), 0)
  const socialTotal = items
    .filter((i) => sourceType(i.source) === 'social')
    .reduce((s, i) => s + (i.order_count || 0), 0)

  return (
    <>
      <PageHeader
        title="Order Sources"
        description="Track orders from delivery apps vs social media channels."
      />

      <ErrorBanner message={error} onRetry={load} />

      {!loading && items.length > 0 && (
        <div className="stat-grid stat-grid--3">
          <div className="mini-stat">
            <span>Delivery Apps</span>
            <strong>{appTotal} orders</strong>
          </div>
          <div className="mini-stat">
            <span>Social Media</span>
            <strong>{socialTotal} orders</strong>
          </div>
          <div className="mini-stat">
            <span>Total Recorded</span>
            <strong>{appTotal + socialTotal} orders</strong>
          </div>
        </div>
      )}

      <div className="grid-2">
        <form className="card form-card" onSubmit={handleSubmit}>
          <h2>Log Orders</h2>
          <label>
            Date
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </label>
          <label>
            Source
            <select
              className="input"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            >
              <optgroup label="Delivery Apps">
                {ORDER_SOURCES.filter((s) => s.type === 'app').map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Social Media">
                {ORDER_SOURCES.filter((s) => s.type === 'social').map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Other">
                {ORDER_SOURCES.filter((s) => s.type === 'direct').map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label>
            Number of Orders
            <input
              type="number"
              className="input"
              value={form.order_count}
              onChange={(e) => setForm({ ...form, order_count: e.target.value })}
              min="1"
              required
            />
          </label>
          <label>
            Revenue (৳)
            <input
              type="number"
              className="input"
              value={form.revenue}
              onChange={(e) => setForm({ ...form, revenue: e.target.value })}
              min="0"
              required
            />
          </label>
          <label>
            Notes
            <input
              className="input"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional"
            />
          </label>
          <button type="submit" className="btn btn--primary">
            Save
          </button>
        </form>

        <section className="card">
          <h2>Records</h2>
          {loading ? <LoadingSpinner /> : <DataTable columns={columns} rows={items} />}
        </section>
      </div>
    </>
  )
}
