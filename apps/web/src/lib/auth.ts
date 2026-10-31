import { User, clearTokens } from './api-client'

export function saveSession(accessToken: string, refreshToken: string, user: User) {
  // Keep each login isolated to its browser tab. This prevents an admin login
  // in another demo tab from replacing the current customer's identity.
  sessionStorage.setItem('access_token', accessToken)
  sessionStorage.setItem('refresh_token', refreshToken)
  sessionStorage.setItem('user', JSON.stringify(user))
}

export function setAuthSession(accessToken: string, refreshToken: string, user: any) {
  saveSession(accessToken, refreshToken, user)
}

export function getSession(): { user: User; token: string } | null {
  if (typeof window === 'undefined') return null
  const token = sessionStorage.getItem('access_token')
  const raw = sessionStorage.getItem('user')
  if (!token || !raw) return null
  try {
    return { user: JSON.parse(raw) as User, token }
  } catch {
    return null
  }
}

export function getUser(): User | null {
  return getSession()?.user ?? null
}

export function getStoredUser(): any | null {
  return getUser()
}

export function isAuthenticated(): boolean {
  return !!getSession()
}

export function isAdmin(): boolean {
  const user = getUser()
  return user?.role === 'admin' || user?.role === 'staff' || (user?.role as any) === 'ADMIN' || (user?.role as any) === 'STAFF'
}

export function isCustomer(): boolean {
  const user = getUser()
  return user?.role === 'customer' || (user?.role as any) === 'CUSTOMER'
}

export function logout() {
  clearTokens()
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

export function clearAuthSession() {
  clearTokens()
}

export function requireAuth(redirectTo = '/login') {
  if (typeof window === 'undefined') return
  if (!isAuthenticated()) {
    window.location.href = redirectTo
  }
}
