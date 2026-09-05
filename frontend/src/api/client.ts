import type {
  DashboardSummary,
  Invoice,
  Buyer,
  BuyerDetail,
  CashFlowForecastResponse,
  PrioritiesResponse,
  TermAnalysis,
  Negotiation,
  ResponseAnalysis,
  Outcome,
  Payment,
  PaymentTimeline,
  BuyerPaymentAnalysis,
  RazorpayStatus,
  PaymentImportResponse,
  AuditLog
} from '../types';


const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorDetail = 'An error occurred';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // Fallback if not JSON
    }
    throw new Error(errorDetail);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Dashboard
  getDashboardSummary: () =>
    request<DashboardSummary>('/api/dashboard/summary'),

  // Invoices
  getInvoices: (status?: string, buyerName?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (buyerName) params.append('buyer_name', buyerName);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<Invoice[]>(`/api/invoices${query}`);
  },

  getInvoice: (invoiceId: string) =>
    request<Invoice>(`/api/invoices/${invoiceId}`),

  createInvoice: (data: {
    invoice_id: string;
    buyer_name: string;
    amount: number;
    invoice_date: string;
    agreed_payment_days: number;
    due_date: string;
  }) =>
    request<Invoice>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateInvoice: (invoiceId: string, data: Partial<Invoice>) =>
    request<Invoice>(`/api/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getTermAnalysis: (invoiceId: string) =>
    request<TermAnalysis>(`/api/invoices/${invoiceId}/term-analysis`),

  // Buyers
  getBuyers: () =>
    request<Buyer[]>('/api/buyers'),

  getBuyer: (buyerId: number) =>
    request<BuyerDetail>(`/api/buyers/${buyerId}`),

  // Forecast
  getForecast: () =>
    request<CashFlowForecastResponse>('/api/forecast'),

  // Priorities
  getPriorities: () =>
    request<PrioritiesResponse>('/api/priorities'),

  // Negotiations
  getNegotiations: () =>
    request<Negotiation[]>('/api/negotiations'),

  getNegotiation: (negotiationId: number) =>
    request<Negotiation>(`/api/negotiations/${negotiationId}`),

  startNegotiation: (invoiceId: string) =>
    request<Negotiation>('/api/negotiations', {
      method: 'POST',
      body: JSON.stringify({ invoice_id: invoiceId }),
    }),

  analyzeBuyerResponse: (negotiationId: number, buyerMessage: string) =>
    request<ResponseAnalysis>(`/api/negotiations/${negotiationId}/response`, {
      method: 'POST',
      body: JSON.stringify({ buyer_message: buyerMessage }),
    }),

  approveNegotiation: (negotiationId: number) =>
    request<Negotiation>(`/api/negotiations/${negotiationId}/approve`, {
      method: 'POST',
    }),

  rejectNegotiation: (negotiationId: number) =>
    request<Negotiation>(`/api/negotiations/${negotiationId}/reject`, {
      method: 'POST',
    }),

  editNegotiation: (negotiationId: number) =>
    request<Negotiation>(`/api/negotiations/${negotiationId}/edit`, {
      method: 'POST',
    }),

  // Outcomes
  getOutcomes: () =>
    request<Outcome[]>('/api/outcomes'),

  recordOutcome: (data: {
    negotiation_id: number;
    final_agreed_term: number | null;
    actual_payment_date: string | null;
    actual_payment_days: number | null;
    cash_flow_gap_before?: number;
    cash_flow_gap_after?: number;
  }) =>
    request<Outcome>('/api/outcomes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Integrations & Payments (Stage 10)
  getRazorpayStatus: () =>
    request<RazorpayStatus>('/api/integrations/razorpay/status'),

  getAuditLogs: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return request<AuditLog[]>(`/api/integrations/audit-logs${query}`);
  },

  getPayments: (params?: {
    status?: string;
    source?: string;
    buyer_id?: number;
    invoice_id?: string;
    limit?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    if (params?.source) sp.append('source', params.source);
    if (params?.buyer_id) sp.append('buyer_id', params.buyer_id.toString());
    if (params?.invoice_id) sp.append('invoice_id', params.invoice_id);
    if (params?.limit) sp.append('limit', params.limit.toString());
    const query = sp.toString() ? `?${sp.toString()}` : '';
    return request<Payment[]>(`/api/payments${query}`);
  },

  getInvoicePayments: (invoiceId: string) =>
    request<PaymentTimeline>(`/api/invoices/${invoiceId}/payments`),

  getBuyerPaymentAnalysis: (buyerId: number) =>
    request<BuyerPaymentAnalysis>(`/api/buyers/${buyerId}/payment-analysis`),

  importPayments: (source?: string) => {
    const query = source ? `?source=${source}` : '';
    return request<PaymentImportResponse>(`/api/payments/import${query}`, {
      method: 'POST',
    });
  },

  // Customer Portal (Stage 12)
  getCustomerDashboard: (email?: string) => {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    return request<import('../types').CustomerDashboardSummary>(`/api/customer/dashboard${query}`);
  },

  getCustomerInvoices: (status?: string, email?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (email) params.append('email', email);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<import('../types').CustomerInvoiceItem[]>(`/api/customer/invoices${query}`);
  },

  getCustomerInvoiceDetail: (invoiceId: string, email?: string) => {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    return request<import('../types').CustomerInvoiceDetail>(`/api/customer/invoices/${invoiceId}${query}`);
  },

  getCustomerPayments: (email?: string) => {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    return request<import('../types').CustomerPaymentItem[]>(`/api/customer/payments${query}`);
  },

  getCustomerRequests: (email?: string) => {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    return request<import('../types').PaymentRequest[]>(`/api/customer/requests${query}`);
  },

  createPaymentRequest: (
    data: {
      invoice_id: string;
      requested_term: number;
      requested_date?: string;
      reason: string;
      message?: string;
    },
    email?: string
  ) => {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    return request<import('../types').PaymentRequest>(`/api/customer/requests${query}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  respondToCounteroffer: (
    requestId: number,
    data: { action: 'ACCEPT' | 'REJECT'; message?: string },
    email?: string
  ) => {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    return request<import('../types').PaymentRequest>(`/api/customer/requests/${requestId}/respond${query}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getCustomerNotifications: (email?: string) => {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    return request<import('../types').CustomerNotification[]>(`/api/customer/notifications${query}`);
  },

  markNotificationRead: (notificationId: number, email?: string) => {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    return request<{ status: string; message: string }>(`/api/customer/notifications/${notificationId}/read${query}`, {
      method: 'POST',
    });
  },

  getUserProfile: (email: string, role: string = 'CUSTOMER') => {
    const query = `?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`;
    return request<import('../types').UserProfile>(`/api/customer/profile${query}`);
  },

  // Admin Customer Requests
  getAdminRequests: (status?: string) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<import('../types').PaymentRequest[]>(`/api/admin/requests${query}`);
  },

  adminRespondRequest: (
    requestId: number,
    data: {
      action: 'APPROVE' | 'REJECT' | 'COUNTEROFFER';
      counter_term?: number;
      counter_date?: string;
      counter_message?: string;
    }
  ) =>
    request<import('../types').PaymentRequest>(`/api/admin/requests/${requestId}/respond`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Demo Control
  resetDemo: () =>
    request<{ status: string; message: string }>('/api/demo/reset', {
      method: 'POST',
    }),
};

