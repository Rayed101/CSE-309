import { useCallback, useEffect, useState } from 'react'
import { commissionsApi } from '../api/services'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { PLATFORMS } from '../config'
import { formatCurrency, formatDate, todayISO } from '../utils/format'

export default function Commissions() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    date: todayISO(),
    platform: 'foodpanda',
    order_amount: '',
    commission_rate: String(PLATFORMS[0].defaultCommission),
    order_id: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await commissionsApi.list())
    } catch {
      setError('Failed to load commissions. Is the API running?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function handlePlatformChange(platformId) {
    const platform = PLATFORMS.find((p) => p.id === platformId)
    setForm({
      ...form,
      platform: platformId,
      commission_rate: String(platform?.defaultCommission ?? ''),
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const orderAmount = Number(form.order_amount)
    const rate = Number(form.commission_rate)
    try {
      await commissionsApi.create({
        date: form.date,
        platform: form.platform,
        order_id: form.order_id,
        order_amount: orderAmount,
        commission_rate: rate,
        commission_amount: Math.round(orderAmount * (rate / 100)),
      })
      setForm({
        date: todayISO(),
        platform: 'foodpanda',
        order_amount: '',
        commission_rate: String(PLATFORMS[0].defaultCommission),
        order_id: '',
      })
      load()
    } catch {
      setError('Failed to save. Check API connection.')
    }
  }

  async function handleDelete(id) {
    try {
      await commissionsApi.delete(id)
      load()
    } catch {
      setError('Failed to delete record.')
    }
  }

  const platformName = (id) => PLATFORMS.find((p) => p.id === id)?.name ?? id

  const columns = [
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    { key: 'platform', label: 'Platform', render: (r) => platformName(r.platform) },
    { key: 'order_id', label: 'Order ID' },
    { key: 'order_amount', label: 'Order Amount', render: (r) => formatCurrency(r.order_amount) },
    {
      key: 'commission_rate',
      label: 'Rate',
      render: (r) => `${r.commission_rate}%`,
    },
    {
      key: 'commission_amount',
      label: 'Commission',
      render: (r) => formatCurrency(r.commission_amount),
    },
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

  const preview =
    form.order_amount && form.commission_rate
      ? Math.round(Number(form.order_amount) * (Number(form.commission_rate) / 100))
      : 0

  return (
    <>
      <PageHeader
        title="Platform Commissions"
        description="Track Foodpanda, Pathao Food, and Foodi commission charges."
      />

      <ErrorBanner message={error} onRetry={load} />

      <div className="grid-2">
        <form className="card form-card" onSubmit={handleSubmit}>
          <h2>Add Commission</h2>
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
            Platform
            <select
              className="input"
              value={form.platform}
              onChange={(e) => handlePlatformChange(e.target.value)}
            >
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (~{p.defaultCommission}%)
                </option>
              ))}
            </select>
          </label>
          <label>
            Order ID
            <input
              className="input"
              value={form.order_id}
              onChange={(e) => setForm({ ...form, order_id: e.target.value })}
              required
            />
          </label>
          <label>
            Order Amount (৳)
            <input
              type="number"
              className="input"
              value={form.order_amount}
              onChange={(e) => setForm({ ...form, order_amount: e.target.value })}
              min="0"
              required
            />
          </label>
          <label>
            Commission Rate (%)
            <input
              type="number"
              className="input"
              value={form.commission_rate}
              onChange={(e) => setForm({ ...form, commission_rate: e.target.value })}
              min="0"
              max="100"
              required
            />
          </label>
          {preview > 0 && (
            <p className="form-preview">Commission: {formatCurrency(preview)}</p>
          )}
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
