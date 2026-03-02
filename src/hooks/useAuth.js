import { useState, useEffect } from 'react'
import { adminService } from '../services/adminService'

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = adminService.isAuthenticated()
      setIsAuthenticated(authenticated)
      setLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (username, password) => {
    try {
      await adminService.login(username, password)
      setIsAuthenticated(true)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    adminService.logout()
    setIsAuthenticated(false)
  }

  return {
    isAuthenticated,
    session: adminService.getSession(),
    loading,
    login,
    logout,
  }
}
