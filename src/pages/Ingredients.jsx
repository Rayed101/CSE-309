import { useCallback, useEffect, useState } from 'react'
import { ingredientsApi } from '../api/services'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { formatCurrency, formatDate, todayISO } from '../utils/format'

export default function Ingredients() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    date: todayISO(),
    item_name: '',
    quantity: '',
    unit: 'kg',
    unit_cost: '',
    supplier: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await ingredientsApi.list())
    } catch {
      setError('Failed to load ingredients. Is the API running?')
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
    const qty = Number(form.quantity)
    const cost = Number(form.unit_cost)
    try {
      await ingredientsApi.create({
        date: form.date,
        item_name: form.item_name,
        quantity: qty,
        unit: form.unit,
        unit_cost: cost,
        total_cost: Math.round(qty * cost),
        supplier: form.supplier,
      })
      setForm({
        date: todayISO(),
        item_name: '',
        quantity: '',
        unit: 'kg',
        unit_cost: '',
        supplier: '',
      })
      load()
    } catch {
      setError('Failed to save. Check API connection.')
    }
  }

  async function handleDelete(id) {
    try {
      await ingredientsApi.delete(id)
      load()
    } catch {
      setError('Failed to delete record.')
    }
  }

  const columns = [
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    { key: 'item_name', label: 'Item' },
    {
      key: 'quantity',
      label: 'Qty',
      render: (r) => `${r.quantity} ${r.unit}`,
    },
    { key: 'unit_cost', label: 'Unit Cost', render: (r) => formatCurrency(r.unit_cost) },
    { key: 'total_cost', label: 'Total', render: (r) => formatCurrency(r.total_cost) },
    { key: 'supplier', label: 'Supplier' },
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
    form.quantity && form.unit_cost
      ? Math.round(Number(form.quantity) * Number(form.unit_cost))
      : 0

  return (
    <>
      <PageHeader
        title="Ingredients"
        description="Track raw material and ingredient purchases."
      />

      <ErrorBanner message={error} onRetry={load} />

      <div className="grid-2">
        <form className="card form-card" onSubmit={handleSubmit}>
          <h2>Add Purchase</h2>
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
            Item Name
            <input
              className="input"
              value={form.item_name}
              onChange={(e) => setForm({ ...form, item_name: e.target.value })}
              placeholder="e.g. Chicken breast"
              required
            />
          </label>
          <div className="form-row">
            <label>
              Quantity
              <input
                type="number"
                className="input"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                min="0"
                step="0.01"
                required
              />
            </label>
            <label>
              Unit
              <select
                className="input"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="L">L</option>
                <option value="pcs">pcs</option>
              </select>
            </label>
          </div>
          <label>
            Unit Cost (৳)
            <input
              type="number"
              className="input"
              value={form.unit_cost}
              onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
              min="0"
              required
            />
          </label>
          <label>
            Supplier
            <input
              className="input"
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              placeholder="Optional"
            />
          </label>
          {preview > 0 && (
            <p className="form-preview">Total: {formatCurrency(preview)}</p>
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
