// Shared API client for the Smart Venue backend.
// All components should import from here instead of using fetch() directly.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = localStorage.getItem('token')
  return token && token !== 'mock-token' ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  let data = null
  const text = await res.text()
  if (text) {
    try { data = JSON.parse(text) } catch { data = text }
  }

  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || res.statusText
    const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const api = {
  // ------- Auth -------
  login:    (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  register: (payload)         => request('/api/auth/register', { method: 'POST', body: payload }),
  me:       ()                => request('/api/auth/me'),

  // ------- Events -------
  listEvents:        (params = {}) => request(`/api/events${qs(params)}`),
  createEvent:       (payload)     => request('/api/events', { method: 'POST', body: payload }),
  getEvent:          (id)          => request(`/api/events/${id}`),
  getEventSeats:     (id)          => request(`/api/events/${id}/seats`),
  getEventAvailability: (id)       => request(`/api/events/${id}/availability`),
  getEventIncidents: (id)          => request(`/api/events/${id}/incidents`),

  // ------- Venues -------
  listVenues:        ()            => request('/api/venues'),

  // ------- Tickets -------
  purchaseTicket:    (payload)        => request('/api/tickets/purchase', { method: 'POST', body: payload }),
  getTicket:         (id)             => request(`/api/tickets/${id}`),
  updateTicketStatus:(id, status)     => request(`/api/tickets/${id}/status`, { method: 'PATCH', body: { status } }),
  getUserTickets:    (userId)         => request(`/api/users/${userId}/tickets`),

  // ------- Check-in -------
  scanCheckin:   (payload) => request('/api/checkin/scan',   { method: 'POST', body: payload }),
  manualCheckin: (payload) => request('/api/checkin/manual', { method: 'POST', body: payload }),
  getEventCheckin: (id)    => request(`/api/checkin/event/${id}`),
  getCheckinLogs:  (id)    => request(`/api/checkin/logs/${id}`),

  // ------- Incidents -------
  createIncident:   (payload)            => request('/api/incidents', { method: 'POST', body: payload }),
  getIncident:      (id)                 => request(`/api/incidents/${id}`),
  patchIncident:    (id, payload)        => request(`/api/incidents/${id}`, { method: 'PATCH', body: payload }),
  addIncidentUpdate:(id, payload)        => request(`/api/incidents/${id}/updates`, { method: 'POST', body: payload }),
  escalateIncident: (id)                 => request(`/api/incidents/${id}/escalate`, { method: 'POST' }),

  // ------- Vendors -------
  listVendors:      ()              => request('/api/vendors'),
  getVendor:        (id)            => request(`/api/vendors/${id}`),
  createVendor:     (payload)       => request('/api/vendors', { method: 'POST', body: payload }),
  updateVendor:     (id, payload)   => request(`/api/vendors/${id}`, { method: 'PATCH', body: payload }),
  assignVendor:     (id, payload)   => request(`/api/vendors/${id}/assignments`, { method: 'POST', body: payload }),

  // ------- Vendor Sales -------
  createVendorSale:        (payload)    => request('/api/vendor-sales', { method: 'POST', body: payload }),
  getVendorSales:          (vendorId)   => request(`/api/vendor-sales/${vendorId}`),
  getEventVendorSales:     (eventId)    => request(`/api/vendor-sales/event/${eventId}`),
  getVendorReconciliation: (eventId)    => request(`/api/vendor-sales/reconciliation/${eventId}`),

  // ------- Crowd -------
  createCrowdEvent: (payload)    => request('/api/crowd/events', { method: 'POST', body: payload }),
  getCrowdEvents:   (eventId)    => request(`/api/crowd/events/${eventId}`),
  getCrowdZones:    (eventId)    => request(`/api/crowd/zones/${eventId}`),
  getCrowdAlerts:   (eventId)    => request(`/api/crowd/alerts/${eventId}`),
  setCrowdThreshold:(payload)    => request('/api/crowd/thresholds', { method: 'POST', body: payload }),

  // ------- Reports -------
  organizerDashboard: (id) => request(`/api/dashboard/organizer/${id}`),
  reportAttendance:   (id) => request(`/api/reports/attendance/${id}`),
  reportRevenue:      (id) => request(`/api/reports/revenue/${id}`),
  reportSafety:       (id) => request(`/api/reports/safety/${id}`),
  reportPostEvent:    (id) => request(`/api/reports/post-event/${id}`),

  // ------- Admin -------
  listAdminUsers: (params = {}) => request(`/api/admin/users${qs(params)}`),
  updateAdminUser:(id, payload) => request(`/api/admin/users/${id}`, { method: 'PATCH', body: payload }),
  adminStats:     ()            => request('/api/admin/stats'),
  adminTopEvents: (limit = 10)  => request(`/api/admin/top-events?limit=${limit}`),

  // ------- Staff -------
  listStaff:    (params = {})    => request(`/api/staff${qs(params)}`),
  createStaff:  (payload)        => request('/api/staff', { method: 'POST', body: payload }),
  updateStaff:  (id, payload)    => request(`/api/staff/${id}`, { method: 'PATCH', body: payload }),
  deleteStaff:  (id)             => request(`/api/staff/${id}`, { method: 'DELETE' }),
}

function qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (entries.length === 0) return ''
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
}

export { BASE_URL }
