import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [hasTeam, setHasTeam] = useState(false)

  const value = useMemo(() => ({
    isLoggedIn,
    hasTeam,
    setIsLoggedIn,
    setHasTeam
  }), [isLoggedIn, hasTeam])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
