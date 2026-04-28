import { useEffect, useState, useCallback } from 'react'
import { providerAuthService } from '../services/providerAuthService'

export function useProviderAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    const current = providerAuthService.getSession()
    setSession(current)
    setIsAuthenticated(providerAuthService.isAuthenticated())
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      const result = await providerAuthService.login(email, password)
      setSession(result)
      setIsAuthenticated(true)
      return { success: true }
    } catch (error) {
      return { success: false, error: error?.message || 'Login failed' }
    }
  }

  const logout = useCallback(() => {
    providerAuthService.logout()
    setSession(null)
    setIsAuthenticated(false)
  }, [])

  // Called by pages when a 401/session-expired error surfaces from the service.
  // Clears local state so ProviderLayout redirects to /provider/login.
  const handleSessionExpired = useCallback(() => {
    providerAuthService.logout()
    setSession(null)
    setIsAuthenticated(false)
  }, [])

  return {
    isAuthenticated,
    session,
    loading,
    login,
    logout,
    handleSessionExpired,
  }
}
