export type Role = 'ROLE_CUSTOMER' | 'ROLE_CAPTAIN' | 'ROLE_ADMIN';

export type VehicleCategory = 'BIKE' | 'AUTO' | 'CAB' | 'WOMEN_BIKE';

export type RideStatus =
  | 'REQUESTED'
  | 'SEARCHING'
  | 'ACCEPTED'
  | 'ARRIVING'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type PaymentMethod = 'CASH' | 'RAZORPAY' | 'CORPORATE' | 'SUBSCRIPTION_PASS';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Vehicle {
  id: string;
  category: VehicleCategory;
  model: string;
  registrationNumber: string;
  color: string;
}

export interface CaptainSummary {
  captainId: string;
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  online: boolean;
  available: boolean;
  womenOnlyEligible?: boolean;
  womenOnlyStatus?: 'NOT_APPLIED' | 'APPLIED' | 'APPROVED' | 'REJECTED';
  womenOnlyRejectionReason?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  ratingAvg: number;
  totalRides: number;
  totalEarnings: number;
  vehicle?: Vehicle;
}

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: Role;
  active: boolean;
  gender?: string;
  avatarUrl?: string;
  captainProfile?: CaptainSummary;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: User;
}

export interface CategoryEstimate {
  category: VehicleCategory;
  categoryName: string;
  etaText: string;
  distanceKm: number;
  durationMinutes: number;
  baseFare: number;
  distanceCharge: number;
  timeCharge: number;
  bookingFee: number;
  taxAmount: number;
  discountAmount: number;
  totalFare: number;
  isAvailable: boolean;
  subscriptionDiscount?: number;
  isSubscriptionFreeRide?: boolean;
}

export interface CouponApplied {
  code: string;
  discountAmount: number;
  description: string;
}

export interface GeoSearchResult {
  placeId: string;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  type: string;
}

export interface GeoReverseResult {
  displayName: string;
  latitude: number;
  longitude: number;
  street?: string;
  suburb?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export interface FareEstimateResponse {
  distanceKm: number;
  durationMinutes: number;
  estimates: CategoryEstimate[];
  couponApplied?: CouponApplied;
  routeGeometry?: [number, number][];
}

export type BillingProfile = 'PERSONAL' | 'CORPORATE';
export type CorporateApprovalStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Ride {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAvatar?: string;
  captainId?: string;
  captainName?: string;
  captainPhone?: string;
  captainAvatar?: string;
  captainRating?: number;
  vehicleCategory: VehicleCategory;
  vehicleModel?: string;
  registrationNumber?: string;
  vehicleColor?: string;
  status: RideStatus;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  destAddress: string;
  destLat: number;
  destLng: number;
  distanceKm: number;
  durationMinutes: number;
  estimatedFare: number;
  finalFare?: number;
  discountAmount: number;
  taxAmount: number;
  couponCode?: string;
  otpCode: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  captainCurrentLat?: number;
  captainCurrentLng?: number;
  cancellationReason?: string;
  cancelledBy?: string;
  isForSomeoneElse?: boolean;
  travelerName?: string;
  travelerPhone?: string;
  travelerRelationship?: string;
  travelerGender?: string;
  passengerDeclarationAcknowledged?: boolean;
  createdAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  billingProfile?: BillingProfile;
  companyId?: string;
  companyName?: string;
  corporateApprovalStatus?: CorporateApprovalStatus;
  requiresApproval?: boolean;
  subscriptionDiscount?: number;
  isSubscriptionFreeRide?: boolean;
}

// Corporate B2B Models
export type CompanyMemberRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
export type CompanyMemberStatus = 'ACTIVE' | 'SUSPENDED' | 'INVITED';
export type CompanyStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE';

export interface Company {
  id: string;
  name: string;
  taxId: string;
  billingAddress: string;
  domain?: string;
  contactEmail: string;
  creditLimit: number;
  usedCredit: number;
  availableCredit: number;
  status: CompanyStatus;
  approvalThreshold: number;
  rejectionReason?: string;
  memberCount: number;
  pendingApprovalsCount: number;
  createdAt: string;
}

export interface CompanyMember {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  role: CompanyMemberRole;
  monthlyBudget: number;
  currentMonthSpent: number;
  remainingBudget: number;
  status: CompanyMemberStatus;
  createdAt: string;
}

export interface RideApprovalRequest {
  id: string;
  rideId?: string;
  companyId: string;
  companyName: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  approverId?: string;
  approverName?: string;
  status: ApprovalStatus;
  estimatedFare: number;
  pickupAddress?: string;
  destAddress?: string;
  reason?: string;
  rejectionReason?: string;
  requestedAt: string;
  reviewedAt?: string;
}

export interface CorporateInvoice {
  id: string;
  companyId: string;
  companyName: string;
  invoiceNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  ridesCount: number;
  status: InvoiceStatus;
  invoiceUrl?: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

export interface CorporateEligibility {
  eligible: boolean;
  requiresApproval: boolean;
  remainingBudget: number;
  estimatedFare: number;
  reason: string;
  companyName?: string;
  companyId?: string;
  memberRole?: string;
}

export interface CorporateDashboardData {
  company: Company;
  members: CompanyMember[];
  pendingApprovals: RideApprovalRequest[];
  recentInvoices: CorporateInvoice[];
  totalRidesTaken: number;
  totalSpentCurrentMonth: number;
}

// Subscription & Commuter Passes Models
export type SubscriptionTier = 'BASIC' | 'COMMUTER' | 'PRO' | 'VIP';
export type SubscriptionInterval = 'MONTHLY' | 'ANNUAL';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  tier: SubscriptionTier;
  price: number;
  interval: SubscriptionInterval;
  discountPercentage: number;
  maxDiscountPerRide: number;
  freeRidesCount: number;
  priorityMatching: boolean;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface UserSubscription {
  id: string;
  userId: string;
  userName: string;
  planId: string;
  planName: string;
  planTier: SubscriptionTier;
  planPrice: number;
  planInterval: SubscriptionInterval;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  remainingFreeRides: number;
  totalDiscountSaved: number;
  totalRidesTaken: number;
  isActive: boolean;
  createdAt: string;
}

export interface SubscriptionUsage {
  id: string;
  userSubscriptionId: string;
  rideId?: string;
  discountApplied: number;
  wasFreeRide: boolean;
  usedAt: string;
}

export interface UserSubscriptionPortal {
  activeSubscription?: UserSubscription;
  availablePlans: SubscriptionPlan[];
  recentUsages: SubscriptionUsage[];
  totalSavings: number;
  ridesWithPass: number;
}

export interface PaymentReceipt {
  paymentId: string;
  rideId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  captainName: string;
  vehicleCategory: VehicleCategory;
  vehicleModel: string;
  registrationNumber: string;
  pickupAddress: string;
  destAddress: string;
  distanceKm: number;
  durationMinutes: number;
  baseFare: number;
  distanceCharge: number;
  timeCharge: number;
  bookingFee: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionRef: string;
  date: string;
}

export interface CaptainAdmin {
  id: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  vehicle?: Vehicle;
  drivingLicenseNumber: string;
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  online: boolean;
  available: boolean;
  womenOnlyEligible: boolean;
  womenOnlyStatus: string;
  womenOnlyRejectionReason?: string;
  ratingAvg: number;
  totalRides: number;
  totalEarnings: number;
  createdAt?: string;
}

export interface AdminOverview {
  totalCustomers: number;
  totalCaptains: number;
  pendingCaptains: number;
  onlineCaptains: number;
  totalRides: number;
  activeRides: number;
  completedRides: number;
  cancelledRides: number;
  grossBookingValue: number;
  totalCollectedPayments: number;
  recentRides: {
    id: string;
    customerName: string;
    captainName: string;
    category: VehicleCategory;
    status: RideStatus;
    fare: number;
    createdAt: string;
  }[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  rideId?: string;
  subject: string;
  category: string;
  description: string;
  status: string;
  adminResponse?: string;
  createdAt: string;
}

export interface FareConfiguration {
  id: string;
  category: VehicleCategory;
  baseFare: number;
  minFare: number;
  perKmRate: number;
  perMinRate: number;
  bookingFee: number;
  taxRatePercent: number;
  active: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountPercent: number;
  maxDiscount: number;
  minRideAmount: number;
  active: boolean;
  expiryDate?: string;
}
