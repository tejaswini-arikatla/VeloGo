import {
  AuthResponse,
  CategoryEstimate,
  CaptainSummary,
  Coupon,
  FareConfiguration,
  FareEstimateResponse,
  GeoReverseResult,
  GeoSearchResult,
  PaymentMethod,
  PaymentReceipt,
  Ride,
  SupportTicket,
  User,
  VehicleCategory,
  VerificationStatus,
  AdminOverview,
  Company,
  CompanyMember,
  CorporateDashboardData,
  CorporateEligibility,
  CorporateInvoice,
  RideApprovalRequest,
  SubscriptionPlan,
  UserSubscription,
  UserSubscriptionPortal,
} from '../types';

const API_BASE = '/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('velogo_token');

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  if (response.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
    const refreshToken = localStorage.getItem('velogo_refresh_token');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const authData: AuthResponse = await refreshRes.json();
          localStorage.setItem('velogo_token', authData.accessToken);
          // Retry original request
          const retryHeaders: Record<string, string> = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authData.accessToken}`,
            ...((options.headers as Record<string, string>) || {}),
          };
          const retryResponse = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: retryHeaders,
          });
          const retryContentType = retryResponse.headers.get('content-type') || '';
          if (!retryResponse.ok) {
            let errMessage = `Request failed (${retryResponse.status})`;
            if (retryContentType.includes('application/json')) {
              try {
                const err = await retryResponse.json();
                if (err?.message) errMessage = err.message;
              } catch {}
            }
            throw new Error(errMessage);
          }
          if (retryContentType.includes('application/json')) {
            return retryResponse.json();
          }
          return {} as T;
        }
      } catch (e) {
        localStorage.removeItem('velogo_token');
        localStorage.removeItem('velogo_refresh_token');
        localStorage.removeItem('velogo_user');
      }
    }
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    if (isJson) {
      try {
        const errorBody = await response.json();
        if (errorBody?.message) {
          errorMessage = errorBody.message;
        }
      } catch {}
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  const text = await response.text();
  if (!text || !text.trim()) {
    return null as unknown as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

export const api = {
  auth: {
    login: (credentials: { emailOrPhone: string; password: string }) =>
      request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),

    registerCustomer: (data: {
      fullName: string;
      email: string;
      phone: string;
      password: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      gender?: string;
    }) =>
      request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    registerCaptain: (data: {
      fullName: string;
      email: string;
      phone: string;
      password: string;
      drivingLicenseNumber: string;
      vehicleCategory: VehicleCategory;
      vehicleModel: string;
      registrationNumber: string;
      vehicleColor: string;
    }) =>
      request<AuthResponse>('/auth/register/captain', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getMe: () => request<User>('/auth/me'),

    logout: (refreshToken?: string) =>
      request<void>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
  },

  rides: {
    estimate: (data: {
      pickupLat: number;
      pickupLng: number;
      pickupAddress: string;
      destLat: number;
      destLng: number;
      destAddress: string;
      couponCode?: string;
    }) =>
      request<FareEstimateResponse>('/rides/estimate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    book: (data: {
      pickupLat: number;
      pickupLng: number;
      pickupAddress: string;
      destLat: number;
      destLng: number;
      destAddress: string;
      vehicleCategory: VehicleCategory;
      paymentMethod: PaymentMethod;
      couponCode?: string;
      isForSomeoneElse?: boolean;
      travelerName?: string;
      travelerPhone?: string;
      travelerRelationship?: string;
      travelerGender?: string;
      passengerDeclarationAcknowledged?: boolean;
      billingProfile?: 'PERSONAL' | 'CORPORATE';
      corporateReason?: string;
    }) =>
      request<Ride>('/rides', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getById: (rideId: string) => request<Ride>(`/rides/${rideId}`),

    cancel: (rideId: string, reason: string) =>
      request<Ride>(`/rides/${rideId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    getMyHistory: () => request<Ride[]>('/rides/history'),
  },

  captain: {
    getProfile: () => request<CaptainSummary>('/captains/me'),

    toggleAvailability: (online: boolean) =>
      request<CaptainSummary>('/captains/availability', {
        method: 'PATCH',
        body: JSON.stringify({ online }),
      }),

    applyWomenOnly: (demoDeclarationAcknowledged: boolean) =>
      request<CaptainSummary>('/captains/women-only/apply', {
        method: 'POST',
        body: JSON.stringify({ demoDeclarationAcknowledged }),
      }),

    updateLocation: (lat: number, lng: number, heading?: number) =>
      request<void>('/captains/location', {
        method: 'POST',
        body: JSON.stringify({ latitude: lat, longitude: lng, heading }),
      }),

    getActiveRide: () => request<Ride | null>('/captains/rides/active'),

    getHistory: () => request<Ride[]>('/captains/rides/history'),

    acceptRide: (rideId: string) =>
      request<Ride>(`/captains/rides/${rideId}/accept`, {
        method: 'POST',
      }),

    arriveAtPickup: (rideId: string) =>
      request<Ride>(`/captains/rides/${rideId}/arrive`, {
        method: 'POST',
      }),

    startTrip: (rideId: string, otpCode: string) =>
      request<Ride>(`/captains/rides/${rideId}/start`, {
        method: 'POST',
        body: JSON.stringify({ otpCode }),
      }),

    completeTrip: (rideId: string) =>
      request<Ride>(`/captains/rides/${rideId}/complete`, {
        method: 'POST',
      }),
  },

  customer: {
    getProfile: () => request<any>('/customers/me'),
    updateProfile: (data: { emergencyContactName?: string; emergencyContactPhone?: string }) =>
      request<any>('/customers/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    getActiveRide: () => request<Ride | null>('/customers/me/active-ride'),
    getHistory: () => request<Ride[]>('/customers/me/rides'),
    getNotifications: () => request<any[]>('/customers/me/notifications'),
  },

  payments: {
    createOrder: (rideId: string, paymentMethod: PaymentMethod) =>
      request<any>('/payments/order', {
        method: 'POST',
        body: JSON.stringify({ rideId, paymentMethod }),
      }),

    verify: (data: {
      paymentId: string;
      razorpayPaymentId?: string;
      razorpayOrderId?: string;
      razorpaySignature?: string;
      simulatedSuccess: boolean;
    }) =>
      request<PaymentReceipt>('/payments/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getReceipt: (rideId: string) => request<PaymentReceipt>(`/payments/receipt/${rideId}`),
  },

  support: {
    submitRating: (rideId: string, score: number, feedback?: string) =>
      request<any>('/support/rating', {
        method: 'POST',
        body: JSON.stringify({ rideId, score, feedback }),
      }),

    createTicket: (data: { rideId?: string; subject: string; category: string; description: string }) =>
      request<SupportTicket>('/support/tickets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getMyTickets: () => request<SupportTicket[]>('/support/tickets/me'),
  },

  admin: {
    getOverview: () => request<AdminOverview>('/admin/overview'),

    getCustomers: (page = 0, size = 20) => request<any>(`/admin/customers?page=${page}&size=${size}`),

    updateCustomerStatus: (userId: string, active: boolean, reason?: string) =>
      request<User>(`/admin/customers/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ active, reason }),
      }),

    getCaptains: (status?: VerificationStatus, page = 0, size = 20) => {
      const q = status ? `status=${status}&` : '';
      return request<any>(`/admin/captains?${q}page=${page}&size=${size}`);
    },

    verifyCaptain: (captainId: string, status: VerificationStatus, reason?: string) =>
      request<any>(`/admin/captains/${captainId}/verification`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      }),

    verifyWomenOnlyCaptain: (captainId: string, status: 'APPROVED' | 'REJECTED', reason?: string) =>
      request<any>(`/admin/captains/${captainId}/women-only`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      }),

    getAllRides: (page = 0, size = 20) => request<any>(`/admin/rides?page=${page}&size=${size}`),

    getPricing: () => request<FareConfiguration[]>('/admin/pricing'),

    updatePricing: (category: VehicleCategory, data: Partial<FareConfiguration>) =>
      request<FareConfiguration>(`/admin/pricing/${category}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    getCoupons: () => request<Coupon[]>('/admin/coupons'),

    createCoupon: (data: Partial<Coupon> & { validDays?: number }) =>
      request<Coupon>('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getAuditLogs: (page = 0, size = 25) => request<any>(`/admin/audit-logs?page=${page}&size=${size}`),

    getAllTickets: (page = 0, size = 20) => request<any>(`/support/admin/tickets?page=${page}&size=${size}`),

    respondTicket: (ticketId: string, adminResponse: string, status: string) =>
      request<SupportTicket>(`/support/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ adminResponse, status }),
      }),
  },

  features: {
    listData: (featureKey?: string) => {
      const query = featureKey ? `?featureKey=${encodeURIComponent(featureKey)}` : '';
      return request<Array<{
        id: string;
        featureKey: string;
        title?: string;
        payload: unknown;
        createdAt: string;
        updatedAt: string;
      }>>(`/features/data${query}`);
    },

    getData: (id: string) =>
      request<{
        id: string;
        featureKey: string;
        title?: string;
        payload: unknown;
        createdAt: string;
        updatedAt: string;
      }>(`/features/data/${encodeURIComponent(id)}`),

    createData: (data: { featureKey: string; title?: string; payload: unknown }) =>
      request('/features/data', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateData: (id: string, data: { featureKey: string; title?: string; payload: unknown }) =>
      request(`/features/data/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteData: (id: string) =>
      request<void>(`/features/data/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },

  geo: {
    search: (q: string, lat?: number, lng?: number) => {
      const p = new URLSearchParams({ q });
      if (lat !== undefined) p.append('lat', lat.toString());
      if (lng !== undefined) p.append('lng', lng.toString());
      return request<GeoSearchResult[]>(`/geo/search?${p.toString()}`);
    },
    reverse: (lat: number, lng: number) =>
      request<GeoReverseResult>(`/geo/reverse?lat=${lat}&lng=${lng}`),
    route: (fromLat: number, fromLng: number, toLat: number, toLng: number) =>
      request<{ distanceKm: number; durationMinutes: number; geometry: [number, number][] }>(
        `/geo/route?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}`
      ),
  },

  corporate: {
    getMyProfile: () => request<CompanyMember | null>('/corporate/profile'),
    checkEligibility: (fare: number) =>
      request<CorporateEligibility>(`/corporate/eligibility?fare=${fare}`),
    getDashboard: () => request<CorporateDashboardData>('/corporate/dashboard'),
    registerCompany: (data: {
      name: string;
      taxId: string;
      billingAddress: string;
      domain?: string;
      contactEmail: string;
      creditLimit: number;
      approvalThreshold: number;
    }) =>
      request<Company>('/corporate/companies', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    addMember: (
      companyId: string,
      data: { userEmail: string; role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'; monthlyBudget: number }
    ) =>
      request<CompanyMember>(`/corporate/companies/${companyId}/members`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateMember: (
      companyId: string,
      memberId: string,
      data: { monthlyBudget?: number; role?: string; status?: string }
    ) =>
      request<CompanyMember>(`/corporate/companies/${companyId}/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    reviewApproval: (
      requestId: string,
      data: { approved: boolean; rejectionReason?: string }
    ) =>
      request<RideApprovalRequest>(`/corporate/approvals/${requestId}/review`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    generateInvoice: (companyId: string, startDate?: string, endDate?: string) => {
      const p = new URLSearchParams();
      if (startDate) p.append('startDate', startDate);
      if (endDate) p.append('endDate', endDate);
      return request<CorporateInvoice>(
        `/corporate/companies/${companyId}/invoices/generate?${p.toString()}`,
        { method: 'POST' }
      );
    },
    getAllCompanies: (status?: string) =>
      request<Company[]>(`/corporate/companies${status ? `?status=${status}` : ''}`),
    verifyCompany: (companyId: string, data: { status: string; rejectionReason?: string }) =>
      request<Company>(`/corporate/companies/${companyId}/verification`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  subscriptions: {
    getPlans: () => request<SubscriptionPlan[]>('/subscriptions/plans'),
    getPortal: () => request<UserSubscriptionPortal>('/subscriptions/portal'),
    createOrder: (planId: string) =>
      request<{
        orderId: string;
        planId: string;
        planName: string;
        amount: number;
        currency: string;
        keyId: string;
      }>(`/subscriptions/order?planId=${planId}`, { method: 'POST' }),
    verifyPayment: (data: {
      planId: string;
      razorpayOrderId: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
    }) =>
      request<UserSubscription>('/subscriptions/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    subscribe: (planId: string, paymentMethodId?: string) =>
      request<UserSubscription>('/subscriptions/subscribe', {
        method: 'POST',
        body: JSON.stringify({ planId, paymentMethodId }),
      }),
    toggleAutoRenew: (subscriptionId: string) =>
      request<UserSubscription>(`/subscriptions/${subscriptionId}/toggle-autorenew`, {
        method: 'POST',
      }),
    cancel: (subscriptionId: string) =>
      request<UserSubscription>(`/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
      }),
  },
};
