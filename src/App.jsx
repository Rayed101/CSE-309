import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DeliveryCosts from './pages/DeliveryCosts'
import Commissions from './pages/Commissions'
import FixedCosts from './pages/FixedCosts'
import Ingredients from './pages/Ingredients'
import OrderSources from './pages/OrderSources'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="delivery-costs" element={<DeliveryCosts />} />
          <Route path="commissions" element={<Commissions />} />
          <Route path="fixed-costs" element={<FixedCosts />} />
          <Route path="ingredients" element={<Ingredients />} />
          <Route path="order-sources" element={<OrderSources />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
