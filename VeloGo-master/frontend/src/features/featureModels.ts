/**
 * Domain models for the VeloGo customer feature suite.
 * These models intentionally live outside the existing booking models so the
 * extension can evolve without changing the team's current ride contracts.
 */
export type FeatureId =
  | 'scheduled'
  | 'stops'
  | 'pooling'
  | 'messages'
  | 'lost-found'
  | 'rewards'
  | 'contacts'
  | 'analytics'
  | 'fare-split'
  | 'eco-impact'
  | 'accessibility'
  | 'commute'
  | 'receipts'
  | 'checklists'
  | 'vehicle-compare'
  | 'travel-budget'
  | 'favorite-places'
  | 'safety-checkins'
  | 'group-trips'
  | 'airport-plans'
  | 'reminders';

export type RecordStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED' | 'ARCHIVED';
export type VehicleChoice = 'BIKE' | 'AUTO' | 'CAB' | 'WOMEN_BIKE';
export type ScheduleStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
export type PoolStatus = 'OPEN' | 'REQUESTED' | 'MATCHED' | 'CANCELLED' | 'EXPIRED';
export type LostItemStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'MATCH_FOUND' | 'RETURNED' | 'CLOSED';
export type MessageAuthor = 'CUSTOMER' | 'SUPPORT' | 'SYSTEM';
export type ContactRelationship = 'FAMILY' | 'FRIEND' | 'COLLEAGUE' | 'OTHER';
export type RewardTransactionKind = 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'ADJUSTMENT';

export interface FeatureRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ScheduledRideRecord extends FeatureRecord {
  pickup: string;
  destination: string;
  vehicle: VehicleChoice;
  scheduledAt: string;
  passengerCount: number;
  note: string;
  estimatedFare: number | null;
  status: ScheduleStatus;
  cancellationReason?: string;
  reminderMinutes: number;
}

export interface RouteStop {
  id: string;
  label: string;
  address: string;
  kind: 'PICKUP' | 'WAYPOINT' | 'DROPOFF';
  dwellMinutes: number;
  completed: boolean;
}

export interface MultiStopRoute extends FeatureRecord {
  name: string;
  description: string;
  stops: RouteStop[];
  vehicle: VehicleChoice;
  estimatedDistanceKm: number;
  estimatedDurationMinutes: number;
  isFavorite: boolean;
  tags: string[];
}

export interface PoolRequest extends FeatureRecord {
  origin: string;
  destination: string;
  departureAt: string;
  seatsRequested: number;
  seatsAvailable: number;
  vehicle: VehicleChoice;
  contributionLimit: number;
  note: string;
  status: PoolStatus;
  matchedWith?: string[];
  ownerName: string;
  ownerId: string;
}

export interface PoolInterest extends FeatureRecord {
  poolRequestId: string;
  passengerId: string;
  passengerName: string;
  seats: number;
  note: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
}

export interface FeatureMessage extends FeatureRecord {
  conversationId: string;
  author: MessageAuthor;
  authorName: string;
  body: string;
  attachmentName?: string;
  readAt?: string;
  category: 'GENERAL' | 'BOOKING' | 'PAYMENT' | 'SAFETY' | 'LOST_ITEM';
}

export interface Conversation extends FeatureRecord {
  title: string;
  category: FeatureMessage['category'];
  status: 'OPEN' | 'WAITING' | 'RESOLVED';
  lastMessageAt: string;
  unreadCount: number;
  messages: FeatureMessage[];
}

export interface LostItemReport extends FeatureRecord {
  rideId: string;
  itemName: string;
  category: 'ELECTRONICS' | 'BAG' | 'DOCUMENT' | 'CLOTHING' | 'OTHER';
  description: string;
  approximateValue: number | null;
  lostAt: string;
  pickupArea: string;
  contactPhone: string;
  status: LostItemStatus;
  referenceCode: string;
  resolutionNote?: string;
}

export interface RewardTransaction extends FeatureRecord {
  kind: RewardTransactionKind;
  points: number;
  description: string;
  sourceId?: string;
  expiresAt?: string;
}

export interface RewardProfile extends FeatureRecord {
  pointsBalance: number;
  lifetimePoints: number;
  currentTier: 'STARTER' | 'SILVER' | 'GOLD' | 'PLATINUM';
  transactions: RewardTransaction[];
  redeemedRewardIds: string[];
}

export interface RewardCatalogItem {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  valueLabel: string;
  category: 'RIDE_CREDIT' | 'UPGRADE' | 'PARTNER';
  active: boolean;
  limitPerCustomer: number;
}

export interface TrustedContact extends FeatureRecord {
  name: string;
  phone: string;
  relationship: ContactRelationship;
  isPrimary: boolean;
  shareTripByDefault: boolean;
  notes: string;
}

export interface TravelInsight {
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  totalDistanceKm: number;
  totalSpend: number;
  averageFare: number;
  averageDistanceKm: number;
  mostUsedVehicle: string;
  mostFrequentDestination: string;
  weekdayRideCount: number;
  weekendRideCount: number;
  estimatedTimeSavedMinutes: number;
  monthlySpend: Array<{ month: string; amount: number; rides: number }>;
  vehicleBreakdown: Array<{ vehicle: string; rides: number; share: number }>;
  destinationBreakdown: Array<{ destination: string; rides: number }>;
}

export interface FeatureStoreSnapshot {
  schemaVersion: number;
  userId: string;
  exportedAt: string;
  scheduledRides: ScheduledRideRecord[];
  routes: MultiStopRoute[];
  poolRequests: PoolRequest[];
  poolInterests: PoolInterest[];
  conversations: Conversation[];
  lostItems: LostItemReport[];
  rewards: RewardProfile;
  contacts: TrustedContact[];
}

export interface FeatureNotice {
  id: string;
  tone: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  createdAt: string;
  dismissed: boolean;
}

export interface FeatureAuditEntry {
  id: string;
  feature: FeatureId;
  action: string;
  recordId?: string;
  timestamp: string;
  summary: string;
}

export interface FeatureFilter<TStatus extends string> {
  status?: TStatus | 'ALL';
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface FeaturePageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface FeatureOperationResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
  warnings: string[];
}

export interface FeatureModuleDefinition {
  id: FeatureId;
  title: string;
  shortTitle: string;
  description: string;
  accent: string;
  icon: string;
  group: 'PLAN' | 'CONNECT' | 'SAFETY' | 'INSIGHTS';
}

export const FEATURE_MODULES: FeatureModuleDefinition[] = [
  { id: 'scheduled', title: 'Scheduled rides', shortTitle: 'Schedule', description: 'Plan a pickup for a future date and time.', accent: 'amber', icon: 'calendar', group: 'PLAN' },
  { id: 'stops', title: 'Multi-stop planner', shortTitle: 'Route planner', description: 'Build a route with several stops and dwell times.', accent: 'sky', icon: 'route', group: 'PLAN' },
  { id: 'pooling', title: 'Ride pooling', shortTitle: 'Pool rides', description: 'Share commute plans and coordinate available seats.', accent: 'violet', icon: 'users', group: 'PLAN' },
  { id: 'messages', title: 'Trip messages', shortTitle: 'Messages', description: 'Keep support conversations organised in one inbox.', accent: 'blue', icon: 'message', group: 'CONNECT' },
  { id: 'lost-found', title: 'Lost and found', shortTitle: 'Lost & found', description: 'Create a traceable report for an item left behind.', accent: 'rose', icon: 'package', group: 'SAFETY' },
  { id: 'rewards', title: 'VeloGo rewards', shortTitle: 'Rewards', description: 'Review points, tiers and available reward options.', accent: 'yellow', icon: 'award', group: 'INSIGHTS' },
  { id: 'contacts', title: 'Trusted contacts', shortTitle: 'Contacts', description: 'Manage people you may share a trip with.', accent: 'emerald', icon: 'shield', group: 'SAFETY' },
  { id: 'analytics', title: 'Travel analytics', shortTitle: 'Analytics', description: 'Explore your ride history and travel patterns.', accent: 'indigo', icon: 'chart', group: 'INSIGHTS' },
  { id: 'fare-split', title: 'Fare split calculator', shortTitle: 'Split fare', description: 'Divide ride expenses and calculate settlements.', accent: 'indigo', icon: 'calculator', group: 'PLAN' },
  { id: 'eco-impact', title: 'Eco impact tracker', shortTitle: 'Eco impact', description: 'Estimate emissions from different travel modes.', accent: 'emerald', icon: 'leaf', group: 'INSIGHTS' },
  { id: 'accessibility', title: 'Accessibility profiles', shortTitle: 'Accessibility', description: 'Save reusable pickup and communication preferences.', accent: 'violet', icon: 'accessibility', group: 'SAFETY' },
  { id: 'commute', title: 'Recurring commute planner', shortTitle: 'Commute plan', description: 'Plan regular routes and estimate commute budgets.', accent: 'sky', icon: 'repeat', group: 'PLAN' },
  { id: 'receipts', title: 'Personal travel records', shortTitle: 'Travel records', description: 'Organise customer-entered expense notes and exports.', accent: 'indigo', icon: 'receipt', group: 'INSIGHTS' },
  { id: 'checklists', title: 'Trip checklists', shortTitle: 'Checklists', description: 'Prepare reusable lists for upcoming journeys.', accent: 'amber', icon: 'checklist', group: 'PLAN' },
  { id: 'vehicle-compare', title: 'Vehicle comparison', shortTitle: 'Compare vehicles', description: 'Rank vehicle estimates using your priorities.', accent: 'cyan', icon: 'car', group: 'PLAN' },
  { id: 'travel-budget', title: 'Travel budget planner', shortTitle: 'Travel budget', description: 'Create monthly travel limits and track expenses.', accent: 'rose', icon: 'target', group: 'INSIGHTS' },
  { id: 'favorite-places', title: 'Favorite locations', shortTitle: 'Saved places', description: 'Keep commonly used addresses for quick copying.', accent: 'emerald', icon: 'bookmark', group: 'PLAN' },
  { id: 'safety-checkins', title: 'Personal trip check-ins', shortTitle: 'Trip check-ins', description: 'Record expected arrivals and trusted contact details.', accent: 'rose', icon: 'shield-check', group: 'SAFETY' },
  { id: 'group-trips', title: 'Group trip organizer', shortTitle: 'Group trips', description: 'Coordinate group members, tasks and budgets.', accent: 'violet', icon: 'users', group: 'CONNECT' },
  { id: 'airport-plans', title: 'Airport transfer planner', shortTitle: 'Airport planner', description: 'Coordinate flight details, pickup time and luggage.', accent: 'sky', icon: 'plane', group: 'PLAN' },
  { id: 'reminders', title: 'Ride reminder center', shortTitle: 'Reminders', description: 'Organise booking, payment and personal reminders.', accent: 'amber', icon: 'bell', group: 'PLAN' },
];

export const DEFAULT_REWARD_CATALOG: RewardCatalogItem[] = [
  { id: 'ride-credit-50', title: '₹50 ride credit', description: 'Apply a credit to an eligible future ride.', pointsCost: 500, valueLabel: '₹50', category: 'RIDE_CREDIT', active: true, limitPerCustomer: 5 },
  { id: 'ride-credit-100', title: '₹100 ride credit', description: 'A larger credit for your next trip.', pointsCost: 900, valueLabel: '₹100', category: 'RIDE_CREDIT', active: true, limitPerCustomer: 3 },
  { id: 'priority-pickup', title: 'Priority pickup token', description: 'A demo reward for a priority matching request.', pointsCost: 700, valueLabel: '1 token', category: 'UPGRADE', active: true, limitPerCustomer: 2 },
  { id: 'partner-perk', title: 'Partner perk', description: 'A sample partner benefit shown in the prototype catalog.', pointsCost: 1200, valueLabel: 'Partner offer', category: 'PARTNER', active: true, limitPerCustomer: 1 },
];

export function createFeatureId(prefix: string): string {
  const randomPart = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
}

export function createFeatureRecord<T extends object>(data: T): T & FeatureRecord {
  const now = new Date().toISOString();
  return { ...data, id: createFeatureId('vg'), createdAt: now, updatedAt: now, version: 1 };
}

export function emptyRewardProfile(): RewardProfile {
  const now = new Date().toISOString();
  return {
    id: createFeatureId('reward-profile'),
    createdAt: now,
    updatedAt: now,
    version: 1,
    pointsBalance: 0,
    lifetimePoints: 0,
    currentTier: 'STARTER',
    transactions: [],
    redeemedRewardIds: [],
  };
}
