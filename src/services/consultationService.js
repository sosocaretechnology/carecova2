const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const API_ROOT = API_BASE_URL ? `${API_BASE_URL}/api` : ''

async function request(path, options = {}) {
  if (!API_ROOT) throw new Error('Consultation booking is not configured yet. Please contact CareCova for assistance.')

  let response
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    })
  } catch {
    throw new Error('We could not reach the booking service. Check your connection and try again.')
  }

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await response.json() : await response.text()
  if (!response.ok) {
    const message = isJson
      ? (Array.isArray(body?.message) ? body.message.join(', ') : body?.message)
      : body
    throw new Error(message || 'Your request could not be processed. Please try again.')
  }
  return body
}

export const consultationService = {
  getConfig: () => request('/consultations/config'),

  searchFacilities: async (search = '') => {
    const params = new URLSearchParams({ limit: '100' })
    if (search.trim()) params.set('search', search.trim())
    const result = await request(`/provider/public/providers?${params.toString()}`)
    const providers = Array.isArray(result) ? result : (result?.providers || result?.items || [])
    return providers
      .filter((provider) => provider?.isActive !== false)
      .map((provider) => ({
        id: String(provider.id || provider._id || ''),
        name: provider.name || 'Partner facility',
        address: provider.address || provider.city || '',
        type: provider.type || '',
      }))
      .filter((provider) => provider.id)
  },

  submitBooking: (payload, idempotencyKey) => request('/consultations/bookings', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  }),
}
