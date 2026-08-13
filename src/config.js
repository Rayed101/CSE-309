// Leave empty in dev to use Vite proxy (/api → localhost:8000). Set in production.
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export const PLATFORMS = [
  { id: 'foodpanda', name: 'Foodpanda', defaultCommission: 25 },
  { id: 'pathao', name: 'Pathao Food', defaultCommission: 20 },
  { id: 'foodi', name: 'Foodi', defaultCommission: 22 },
]

export const FIXED_COST_TYPES = [
  { id: 'rent', label: 'Rent' },
  { id: 'gas', label: 'Gas Bill' },
  { id: 'electricity', label: 'Electricity Bill' },
  { id: 'salaries', label: 'Staff Salaries' },
  { id: 'other', label: 'Other' },
]

export const ORDER_SOURCES = [
  { id: 'foodpanda', label: 'Foodpanda', type: 'app' },
  { id: 'pathao', label: 'Pathao Food', type: 'app' },
  { id: 'foodi', label: 'Foodi', type: 'app' },
  { id: 'facebook', label: 'Facebook', type: 'social' },
  { id: 'instagram', label: 'Instagram', type: 'social' },
  { id: 'whatsapp', label: 'WhatsApp', type: 'social' },
  { id: 'direct', label: 'Direct / Walk-in', type: 'direct' },
]
