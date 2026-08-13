import { useCallback, useEffect, useState } from 'react'
import { deliveryCostsApi } from '../api/services'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { formatCurrency, formatDate, todayISO } from '../utils/format'

export default function DeliveryCosts() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    date: todayISO(),
    order_id: '',
    delivery_fee: '',
    rider_tip: '',
    notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await deliveryCostsApi.list())
    } catch {
      setError('Failed to load delivery costs. Is the API running?')
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
      await deliveryCostsApi.create({
        date: form.date,
        order_id: form.order_id,
        delivery_fee: Number(form.delivery_fee),
        rider_tip: Number(form.rider_tip) || 0,
        notes: form.notes,
      })
      setForm({ date: todayISO(), order_id: '', delivery_fee: '', rider_tip: '', notes: '' })
      load()
    } catch {
      setError('Failed to save. Check API connection.')
    }
  }

  async function handleDelete(id) {
    try {
      await deliveryCostsApi.delete(id)
      load()
    } catch {
      setError('Failed to delete record.')
    }
  }

  const columns = [
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    { key: 'order_id', label: 'Order ID' },
    { key: 'delivery_fee', label: 'Delivery Fee', render: (r) => formatCurrency(r.delivery_fee) },
    { key: 'rider_tip', label: 'Rider Tip', render: (r) => formatCurrency(r.rider_tip) },
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

  return (
    <>
      <PageHeader
        title="Delivery Costs"
        description="Track per-order delivery fees and rider tips."
      />

      <ErrorBanner message={error} onRetry={load} />

      <div className="grid-2">
        <form className="card form-card" onSubmit={handleSubmit}>
          <h2>Add Delivery Cost</h2>
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
            Order ID
            <input
              className="input"
              value={form.order_id}
              onChange={(e) => setForm({ ...form, order_id: e.target.value })}
              placeholder="e.g. FP-12345"
              required
            />
          </label>
          <label>
            Delivery Fee (৳)
            <input
              type="number"
              className="input"
              value={form.delivery_fee}
              onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })}
              min="0"
              required
            />
          </label>
          <label>
            Rider Tip (৳)
            <input
              type="number"
              className="input"
              value={form.rider_tip}
              onChange={(e) => setForm({ ...form, rider_tip: e.target.value })}
              min="0"
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
