import { User, clearTokens } from './api-client'

export function saveSession(accessToken: string, refreshToken: string, user: User) {
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
  localStorage.setItem('user', JSON.stringify(user))
}

export function getSession(): { user: User; token: string } | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('access_token')
  const raw = localStorage.getItem('user')
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

export function isAuthenticated(): boolean {
  return !!getSession()
}

export function isAdmin(): boolean {
  const user = getUser()
  return user?.role === 'admin' || user?.role === 'staff'
}

export function isCustomer(): boolean {
  const user = getUser()
  return user?.role === 'customer'
}

export function logout() {
  clearTokens()
  window.location.href = '/login'
}

export function requireAuth(redirectTo = '/login') {
  if (typeof window === 'undefined') return
  if (!isAuthenticated()) {
    window.location.href = redirectTo
  }
}
