import { useCallback, useEffect, useState } from 'react'
import { fixedCostsApi } from '../api/services'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { FIXED_COST_TYPES } from '../config'
import { formatCurrency, currentMonth } from '../utils/format'

export default function FixedCosts() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    month: currentMonth(),
    type: 'rent',
    amount: '',
    description: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await fixedCostsApi.list())
    } catch {
      setError('Failed to load fixed costs. Is the API running?')
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
      await fixedCostsApi.create({
        month: form.month,
        type: form.type,
        amount: Number(form.amount),
        description: form.description,
      })
      setForm({ month: currentMonth(), type: 'rent', amount: '', description: '' })
      load()
    } catch {
      setError('Failed to save. Check API connection.')
    }
  }

  async function handleDelete(id) {
    try {
      await fixedCostsApi.delete(id)
      load()
    } catch {
      setError('Failed to delete record.')
    }
  }

  const typeLabel = (id) => FIXED_COST_TYPES.find((t) => t.id === id)?.label ?? id

  const columns = [
    { key: 'month', label: 'Month' },
    { key: 'type', label: 'Type', render: (r) => typeLabel(r.type) },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'description', label: 'Description' },
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

  const total = items.reduce((sum, i) => sum + (i.amount || 0), 0)

  return (
    <>
      <PageHeader
        title="Fixed Costs"
        description="Monthly rent, utilities, and staff salaries."
      />

      <ErrorBanner message={error} onRetry={load} />

      <div className="grid-2">
        <form className="card form-card" onSubmit={handleSubmit}>
          <h2>Add Fixed Cost</h2>
          <label>
            Month
            <input
              type="month"
              className="input"
              value={form.month}
              onChange={(e) => setForm({ ...form, month: e.target.value })}
              required
            />
          </label>
          <label>
            Type
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {FIXED_COST_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Amount (৳)
            <input
              type="number"
              className="input"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              min="0"
              required
            />
          </label>
          <label>
            Description
            <input
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional notes"
            />
          </label>
          <button type="submit" className="btn btn--primary">
            Save
          </button>
        </form>

        <section className="card">
          <div className="card__header-row">
            <h2>Records</h2>
            {!loading && items.length > 0 && (
              <span className="badge">Total: {formatCurrency(total)}</span>
            )}
          </div>
          {loading ? <LoadingSpinner /> : <DataTable columns={columns} rows={items} />}
        </section>
      </div>
    </>
  )
}
