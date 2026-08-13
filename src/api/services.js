import { api } from './client'

export const dashboardApi = {
  getSummary: (month) => api.get(`/api/dashboard/summary${month ? `?month=${month}` : ''}`),
}

export const deliveryCostsApi = {
  list: () => api.get('/api/delivery-costs'),
  create: (data) => api.post('/api/delivery-costs', data),
  delete: (id) => api.delete(`/api/delivery-costs/${id}`),
}

export const commissionsApi = {
  list: () => api.get('/api/commissions'),
  create: (data) => api.post('/api/commissions', data),
  delete: (id) => api.delete(`/api/commissions/${id}`),
}

export const fixedCostsApi = {
  list: () => api.get('/api/fixed-costs'),
  create: (data) => api.post('/api/fixed-costs', data),
  delete: (id) => api.delete(`/api/fixed-costs/${id}`),
}

export const ingredientsApi = {
  list: () => api.get('/api/ingredients'),
  create: (data) => api.post('/api/ingredients', data),
  delete: (id) => api.delete(`/api/ingredients/${id}`),
}

export const orderSourcesApi = {
  list: () => api.get('/api/order-sources'),
  create: (data) => api.post('/api/order-sources', data),
  delete: (id) => api.delete(`/api/order-sources/${id}`),
}
