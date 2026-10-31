// ─── API Client ───────────────────────────────────────────────────────────────
// Typed fetch wrapper. Attaches the current tab's Bearer token automatically.

const DEFAULT_API_URL = 'https://brightloop-sms-api.onrender.com/api/v1';

export function getBaseUrl(): string {
  // If running in browser: verify hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    if (!isLocalhost) {
      // Deployed client: strictly prohibit localhost URLs
      const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
      if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        try {
          const host = new URL(envUrl).host;
          // Guard against misconfiguration pointing at frontend web hosts
          if (host === hostname || ['make-a-thon.onrender.com', 'web-smoky-chi-41.vercel.app'].includes(host)) {
            return DEFAULT_API_URL;
          }
          return envUrl.replace(/\/+$/, '');
        } catch {
          return DEFAULT_API_URL;
        }
      }
      return DEFAULT_API_URL;
    }
  }

  // Server-side or local environment:
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) {
    if (process.env.NODE_ENV === 'production' && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      return DEFAULT_API_URL;
    }
    return envUrl.replace(/\/+$/, '');
  }

  if (process.env.NODE_ENV === 'production') {
    return DEFAULT_API_URL;
  }

  return 'http://localhost:3001/api/v1';
}

export const BASE_URL = getBaseUrl();

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('access_token')
}

function setTokens(access: string, refresh: string) {
  sessionStorage.setItem('access_token', access)
  sessionStorage.setItem('refresh_token', refresh)
}

export function clearTokens() {
  sessionStorage.removeItem('access_token')
  sessionStorage.removeItem('refresh_token')
  sessionStorage.removeItem('user')
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = sessionStorage.getItem('refresh_token')
  if (!refresh) return null
  try {
    const res = await fetch(`${getBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    })
    if (!res.ok) return null
    const data = await res.json()
    setTokens(data.accessToken, data.refreshToken)
    return data.accessToken
  } catch {
    return null
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${getBaseUrl()}${path}`, { ...options, headers })

  // Auto-refresh on 401
  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken()
    if (newToken) return request<T>(path, options, false)
    clearTokens()
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new ApiError(401, 'Unauthorized')
  }

  if (!res.ok) {
    let message = `Request failed: ${res.status}`
    let data: unknown
    try {
      data = await res.json()
      if (typeof data === 'object' && data !== null && 'message' in data) {
        const rawMessage = (data as { message: string | string[] }).message
        message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage
      }
    } catch {}
    throw new ApiError(res.status, message, data)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json()
}

// ─── Generic CRUD helpers ─────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

// ─── Paginated response type ──────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  [key: string]: string | number | undefined
}

export function buildQueryString(params: PaginationParams): string {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') q.set(k, String(v))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

export interface LoginPayload { email: string; password: string }
export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}
export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'staff' | 'customer'
  customerId?: string
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', payload),
  register: (payload: { name: string; email: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', payload),
  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, password }),
  me: () => api.get<User>('/auth/me'),
}

// ─── Dashboard endpoints ──────────────────────────────────────────────────────

export interface DashboardMetrics {
  activeSubscriptions: number
  monthlyRecurringRevenue: number
  outstandingAmount: number
  overdueAmount: number
  revenueThisMonth: number
  newCustomersThisMonth: number
}

export interface RevenueDataPoint { month: string; revenue: number }

export const dashboardApi = {
  metrics: () => api.get<DashboardMetrics>('/dashboard/metrics'),
  revenue: () => api.get<RevenueDataPoint[]>('/dashboard/revenue'),
}

// ─── Customers ────────────────────────────────────────────────────────────────

export interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  status: 'active' | 'inactive' | 'suspended'
  createdAt: string
  subscriptionCount?: number
}

export const customersApi = {
  list: (params: PaginationParams) =>
    api.get<PaginatedResponse<Customer>>(`/customers${buildQueryString(params)}`),
  get: (id: string) => api.get<Customer>(`/customers/${id}`),
  create: (data: Partial<Customer>) => api.post<Customer>('/customers', data),
  update: (id: string, data: Partial<Customer>) =>
    api.put<Customer>(`/customers/${id}`, data),
  delete: (id: string) => api.delete<void>(`/customers/${id}`),
  subscriptions: (id: string) =>
    api.get<PaginatedResponse<Subscription>>(`/customers/${id}/subscriptions`),
  invoices: (id: string) =>
    api.get<PaginatedResponse<Invoice>>(`/customers/${id}/invoices`),
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface ProductVariant {
  id: string
  name: string
  priceAdjustment: number
  billingCycle: 'monthly' | 'quarterly' | 'annually'
}

export interface Product {
  id: string
  name: string
  description?: string
  basePrice: number
  currency: string
  status: 'active' | 'inactive' | 'archived'
  variants: ProductVariant[]
  createdAt: string
}

export const productsApi = {
  list: (params: PaginationParams) =>
    api.get<PaginatedResponse<Product>>(`/products${buildQueryString(params)}`),
  get: (id: string) => api.get<Product>(`/products/${id}`),
  create: (data: Partial<Product>) => api.post<Product>('/products', data),
  update: (id: string, data: Partial<Product>) =>
    api.put<Product>(`/products/${id}`, data),
  delete: (id: string) => api.delete<void>(`/products/${id}`),
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export interface Plan {
  id: string
  name: string
  productId: string
  product?: Product
  variantId?: string
  price: number
  currency: string
  billingCycle: 'monthly' | 'quarterly' | 'annually'
  status: 'active' | 'inactive'
  trialDays?: number
  createdAt: string
}

export const plansApi = {
  list: (params: PaginationParams) =>
    api.get<PaginatedResponse<Plan>>(`/plans${buildQueryString(params)}`),
  get: (id: string) => api.get<Plan>(`/plans/${id}`),
  create: (data: Partial<Plan>) => api.post<Plan>('/plans', data),
  update: (id: string, data: Partial<Plan>) =>
    api.patch<Plan>(`/plans/${id}`, data),
}

// ─── Quotations ───────────────────────────────────────────────────────────────

export interface QuotationLine {
  productId: string
  description: string
  qty: number
  unitPrice: number
  total: number
}

export interface Quotation {
  id: string
  number: string
  customerId: string
  customer?: Customer
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  lines: QuotationLine[]
  subtotal: number
  tax: number
  total: number
  validUntil: string
  notes?: string
  createdAt: string
}

export const quotationsApi = {
  list: (params: PaginationParams) =>
    api.get<PaginatedResponse<Quotation>>(`/quotations${buildQueryString(params)}`),
  get: (id: string) => api.get<Quotation>(`/quotations/${id}`),
  create: (data: Partial<Quotation>) => api.post<Quotation>('/quotations', data),
  update: (id: string, data: Partial<Quotation>) =>
    api.put<Quotation>(`/quotations/${id}`, data),
  send: (id: string) => api.patch<Quotation>(`/quotations/${id}/send`, {}),
  accept: (id: string) => api.patch<Quotation>(`/quotations/${id}/accept`, {}),
  reject: (id: string) => api.patch<Quotation>(`/quotations/${id}/reject`, {}),
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export interface Subscription {
  id: string
  customerId: string
  customer?: Customer
  planId: string
  plan?: Plan
  status: 'active' | 'paused' | 'cancelled' | 'expired' | 'trialing'
  startDate: string
  endDate?: string
  nextBillingDate?: string
  price: number
  currency: string
  createdAt: string
}

export const subscriptionsApi = {
  list: (params: PaginationParams) =>
    api.get<PaginatedResponse<Subscription>>(`/subscriptions${buildQueryString(params)}`),
  get: (id: string) => api.get<Subscription>(`/subscriptions/${id}`),
  create: (data: Partial<Subscription>) =>
    api.post<Subscription>('/subscriptions', data),
  cancel: (id: string, reason?: string) =>
    api.patch<Subscription>(`/subscriptions/${id}/cancel`, { reason }),
  pause: (id: string) =>
    api.patch<Subscription>(`/subscriptions/${id}/pause`, {}),
  resume: (id: string) =>
    api.patch<Subscription>(`/subscriptions/${id}/resume`, {}),
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export interface InvoiceLine {
  description: string
  qty: number
  unitPrice: number
  total: number
}

export interface Invoice {
  id: string
  number: string
  customerId: string
  customer?: Customer
  subscriptionId?: string
  status: 'draft' | 'open' | 'paid' | 'void' | 'overdue'
  lines: InvoiceLine[]
  subtotal: number
  tax: number
  total: number
  dueDate: string
  paidAt?: string
  pdfUrl?: string
  createdAt: string
}

export const invoicesApi = {
  list: (params: PaginationParams) =>
    api.get<PaginatedResponse<Invoice>>(`/invoices${buildQueryString(params)}`),
  get: (id: string) => api.get<Invoice>(`/invoices/${id}`),
  void: (id: string) => api.patch<Invoice>(`/invoices/${id}/cancel`, {}),
  send: (id: string) => api.post<Invoice>(`/invoices/${id}/send`, {}),
  downloadPdf: async (id: string) => {
    const token = getToken()
    const res = await fetch(`${getBaseUrl()}/invoices/${id}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new ApiError(res.status, 'Failed to download PDF')
    return res.blob()
  },
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export interface Payment {
  id: string
  invoiceId: string
  invoice?: Invoice
  customerId: string
  customer?: Customer
  amount: number
  currency: string
  method: 'card' | 'bank_transfer' | 'cash' | 'check' | 'other'
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  reference?: string
  paidAt: string
  createdAt: string
}

export const paymentsApi = {
  list: (params: PaginationParams) =>
    api.get<PaginatedResponse<Payment>>(`/payments${buildQueryString(params)}`),
  get: (id: string) => api.get<Payment>(`/payments/${id}`),
  create: (data: Partial<Payment>) => api.post<Payment>('/payments', data),
  refund: (id: string) => api.post<Payment>(`/payments/${id}/refund`, {}),
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export interface BillingRun {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  scheduledAt: string
  startedAt?: string
  completedAt?: string
  invoicesGenerated: number
  totalAmount: number
  errors: number
}

export const billingApi = {
  runs: (params: PaginationParams) =>
    api.get<PaginatedResponse<BillingRun>>(`/billing/runs${buildQueryString(params)}`),
  triggerRun: () => api.post<BillingRun>('/billing/trigger', {}),
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface AgingBucket {
  customerId: string
  customerName: string
  current: number
  days30: number
  days60: number
  days90: number
  over90: number
  total: number
}

export const reportsApi = {
  revenue: (params: { from?: string; to?: string }) =>
    api.get<RevenueDataPoint[]>(`/reports/revenue${buildQueryString(params)}`),
  aging: () => api.get<AgingBucket[]>('/reports/aging'),
}

// ─── Users (admin) ────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'staff'
  status: 'active' | 'inactive'
  createdAt: string
}

export const usersApi = {
  list: (params: PaginationParams) =>
    api.get<PaginatedResponse<AdminUser>>(`/users${buildQueryString(params)}`),
  create: (data: Partial<AdminUser> & { password: string }) =>
    api.post<AdminUser>('/users', data),
  update: (id: string, data: Partial<AdminUser>) =>
    api.patch<AdminUser>(`/users/${id}`, data),
  delete: (id: string) => api.delete<void>(`/users/${id}`),
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface AppSettings {
  companyName: string
  companyEmail: string
  defaultCurrency: string
  taxRate: number
  invoicePrefix: string
  paymentTermsDays: number
  smtpConfigured: boolean
}

export const settingsApi = {
  get: () => api.get<AppSettings>('/settings'),
  update: (data: Partial<AppSettings>) => api.put<AppSettings>('/settings', data),
}

export const apiClient = api;

