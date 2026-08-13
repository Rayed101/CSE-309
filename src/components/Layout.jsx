import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { checkHealth } from '../api/client'

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/delivery-costs', label: 'Delivery Costs', icon: '🛵' },
  { to: '/commissions', label: 'Platform Commissions', icon: '💳' },
  { to: '/fixed-costs', label: 'Fixed Costs', icon: '🏠' },
  { to: '/ingredients', label: 'Ingredients', icon: '🥬' },
  { to: '/order-sources', label: 'Order Sources', icon: '📱' },
]

export default function Layout() {
  const [apiOnline, setApiOnline] = useState(null)

  useEffect(() => {
    checkHealth().then(setApiOnline)
  }, [])

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">🍳</span>
          <div>
            <strong>Finvo</strong>
            <small>Cloud Kitchen</small>
          </div>
        </div>

        <nav className="sidebar__nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__status">
          <span
            className={`status-dot ${apiOnline ? 'status-dot--online' : 'status-dot--offline'}`}
          />
          API {apiOnline === null ? 'checking…' : apiOnline ? 'connected' : 'offline'}
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
