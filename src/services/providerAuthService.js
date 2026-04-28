const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const API_ROOT = API_BASE_URL ? `${API_BASE_URL}/api` : ''
const PROVIDER_SESSION_KEY = 'carecova_provider_session'

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await response.json() : await response.text()
  if (!response.ok) {
    const message =
      (isJson && (Array.isArray(body?.message) ? body.message.join(', ') : body?.message)) ||
      (typeof body === 'string' ? body : 'Request failed')
    throw new Error(message)
  }
  return body
}

function getStoredSession() {
  try {
    const raw = localStorage.getItem(PROVIDER_SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSession(session) {
  localStorage.setItem(PROVIDER_SESSION_KEY, JSON.stringify(session))
}

function clearSession() {
  localStorage.removeItem(PROVIDER_SESSION_KEY)
}

function getAccessToken() {
  return getStoredSession()?.accessToken || null
}

function getRefreshToken() {
  return getStoredSession()?.refreshToken || null
}

// Attempt to get a new access token using the stored refresh token.
// Returns the new accessToken string, or throws if refresh fails.
async function attemptRefresh() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token available')

  const response = await fetch(`${API_ROOT}/provider/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  const body = await parseResponse(response)

  // Merge new tokens into the existing stored session
  const existing = getStoredSession() || {}
  const updated = {
    ...existing,
    accessToken: body.accessToken,
    refreshToken: body.refreshToken ?? existing.refreshToken,
    provider: body.provider ?? existing.provider,
  }
  saveSession(updated)
  return body.accessToken
}

// Fetch wrapper that:
//  1. Sends the request with the current access token
//  2. On 401 — tries to refresh once and retries
//  3. On second 401 — clears session and throws so the UI redirects to login
async function fetchWithAuth(url, options = {}) {
  if (!API_ROOT) throw new Error('Backend API is not configured')

  const token = getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const makeHeaders = (tok) => ({
    'Content-Type': 'application/json',
    ...options.headers,
    Authorization: `Bearer ${tok}`,
  })

  let response = await fetch(url, { ...options, headers: makeHeaders(token) })

  if (response.status === 401) {
    // Token may be expired — try to refresh once
    let newToken
    try {
      newToken = await attemptRefresh()
    } catch {
      // Refresh also failed — session is invalid, force logout
      clearSession()
      throw new Error('Session expired. Please log in again.')
    }

    // Retry the original request with the fresh token
    response = await fetch(url, { ...options, headers: makeHeaders(newToken) })

    if (response.status === 401) {
      clearSession()
      throw new Error('Session expired. Please log in again.')
    }
  }

  return parseResponse(response)
}

export const providerAuthService = {
  login: async (email, password) => {
    if (!API_ROOT) throw new Error('Backend API is not configured')
    const response = await fetch(`${API_ROOT}/provider/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: String(email || '').trim().toLowerCase(),
        password: String(password || ''),
      }),
    })
    const body = await parseResponse(response)
    const provider = body?.provider || body?.user || {}
    const session = {
      accessToken: body?.accessToken,
      refreshToken: body?.refreshToken,
      provider,
      email: provider?.email || String(email || '').trim().toLowerCase(),
      loggedIn: true,
      loginTime: new Date().toISOString(),
    }
    saveSession(session)
    return session
  },

  getSession: () => getStoredSession(),

  isAuthenticated: () => {
    const s = getStoredSession()
    return Boolean(s?.accessToken)
  },

  logout: () => clearSession(),

  getProfile: () =>
    fetchWithAuth(`${API_ROOT}/provider/profile`),

  updateProfile: (updates) =>
    fetchWithAuth(`${API_ROOT}/provider/profile`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  getStats: () =>
    fetchWithAuth(`${API_ROOT}/provider/stats`),

  getPatients: ({ page = 1, limit = 20, search = '' } = {}) => {
    const params = new URLSearchParams({ page, limit, ...(search ? { search } : {}) })
    return fetchWithAuth(`${API_ROOT}/provider/patients?${params}`)
  },

  getLoans: ({ page = 1, limit = 20, status = '' } = {}) => {
    const params = new URLSearchParams({ page, limit, ...(status ? { status } : {}) })
    return fetchWithAuth(`${API_ROOT}/provider/loans?${params}`)
  },

  getRepayments: ({ page = 1, limit = 20 } = {}) => {
    const params = new URLSearchParams({ page, limit })
    return fetchWithAuth(`${API_ROOT}/provider/repayments?${params}`)
  },

  registerPatient: (data) =>
    fetchWithAuth(`${API_ROOT}/provider/register-patient`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}
