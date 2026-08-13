import { useCallback, useEffect, useState } from 'react'
import { dashboardApi } from '../api/services'
import StatCard from '../components/StatCard'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { currentMonth } from '../utils/format'
import { ORDER_SOURCES } from '../config'

const EMPTY = {
  total_revenue: 0,
  total_costs: 0,
  net_profit: 0,
  delivery_costs: 0,
  commission_costs: 0,
  fixed_costs: 0,
  ingredient_costs: 0,
  orders_by_source: {},
  total_orders: 0,
}

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonth())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await dashboardApi.getSummary(month)
      setData(res)
    } catch (err) {
      setData(EMPTY)
      setError(
        'Could not reach the API. Start your FastAPI backend at localhost:8000, or set VITE_API_URL.'
      )
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    load()
  }, [load])

  const summary = data ?? EMPTY
  const appOrders = ORDER_SOURCES.filter((s) => s.type === 'app').reduce(
    (sum, s) => sum + (summary.orders_by_source?.[s.id] || 0),
    0
  )
  const socialOrders = ORDER_SOURCES.filter((s) => s.type === 'social').reduce(
    (sum, s) => sum + (summary.orders_by_source?.[s.id] || 0),
    0
  )

  return (
    <>
      <PageHeader title="Dashboard" description="Monthly overview of your cloud kitchen finances.">
        <input
          type="month"
          className="input input--sm"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </PageHeader>

      <ErrorBanner message={error} onRetry={load} />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard label="Total Revenue" value={summary.total_revenue} variant="green" />
            <StatCard label="Total Costs" value={summary.total_costs} variant="red" />
            <StatCard
              label="Net Profit"
              value={summary.net_profit}
              variant={summary.net_profit >= 0 ? 'green' : 'red'}
            />
            <StatCard label="Total Orders" value={summary.total_orders} sub="this month" />
          </div>

          <div className="grid-2">
            <section className="card">
              <h2>Cost Breakdown</h2>
              <ul className="breakdown-list">
                <li>
                  <span>Delivery costs</span>
                  <strong>৳{summary.delivery_costs?.toLocaleString() ?? 0}</strong>
                </li>
                <li>
                  <span>Platform commissions</span>
                  <strong>৳{summary.commission_costs?.toLocaleString() ?? 0}</strong>
                </li>
                <li>
                  <span>Fixed costs</span>
                  <strong>৳{summary.fixed_costs?.toLocaleString() ?? 0}</strong>
                </li>
                <li>
                  <span>Ingredients</span>
                  <strong>৳{summary.ingredient_costs?.toLocaleString() ?? 0}</strong>
                </li>
              </ul>
            </section>

            <section className="card">
              <h2>Order Sources</h2>
              <div className="source-bars">
                <div className="source-bar">
                  <div className="source-bar__header">
                    <span>Delivery Apps</span>
                    <strong>{appOrders} orders</strong>
                  </div>
                  <div className="progress">
                    <div
                      className="progress__fill progress__fill--app"
                      style={{
                        width: summary.total_orders
                          ? `${(appOrders / summary.total_orders) * 100}%`
                          : '0%',
                      }}
                    />
                  </div>
                </div>
                <div className="source-bar">
                  <div className="source-bar__header">
                    <span>Social Media</span>
                    <strong>{socialOrders} orders</strong>
                  </div>
                  <div className="progress">
                    <div
                      className="progress__fill progress__fill--social"
                      style={{
                        width: summary.total_orders
                          ? `${(socialOrders / summary.total_orders) * 100}%`
                          : '0%',
                      }}
                    />
                  </div>
                </div>
              </div>

              {summary.total_orders > 0 && (
                <ul className="breakdown-list breakdown-list--compact">
                  {ORDER_SOURCES.map((src) => {
                    const count = summary.orders_by_source?.[src.id] || 0
                    if (!count) return null
                    return (
                      <li key={src.id}>
                        <span>{src.label}</span>
                        <strong>{count}</strong>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </>
  )
}
