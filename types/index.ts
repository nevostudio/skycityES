export type PropertyType =
  | "house"
  | "shop"
  | "restaurant"
  | "office"
  | "apartment"
  | "tower"
  | "warehouse"
  | "nightclub"
  | "hotel"
  | "mall"
  | "billboard"
  | "landmark";
export type Tier = "STANDARD" | "POPULAR" | "PREMIUM" | "ICONIC";
export type PresenceTier = "STARTER" | "PLUS" | "PRO" | "PREMIUM" | "LANDMARK";
/** Size of what stands on a plot. SKYSCRAPER is premium inventory, never a €3–€60 tier. */
export type BuildingTier = PresenceTier | "SKYSCRAPER";
/** EMPTY: plot without building · CONSTRUCTING: just built/upgraded · BUILT: standing. */
export type BuildingState = "EMPTY" | "CONSTRUCTING" | "BUILT";
export type UpgradeRecord = {
  reservationId: string;
  transactionId: string;
  from: PresenceTier;
  to: PresenceTier;
  amount: number;
  createdAt: string;
};
/** Where the optional advertising image is shown. The rooftop sign is always present. */
export type ImageSupport =
  "SIDE_BILLBOARD" | "PARTIAL_FACADE" | "FULL_FACADE" | "VERTICAL_SCREEN";
export type Ad = {
  brand: string;
  /** Short phrase under the name on the rooftop sign. */
  tagline: string;
  description: string;
  website: string;
  instagram: string;
  tiktok: string;
  x: string;
  linkedin: string;
  logo: string;
  banner: string;
  promo: string;
  cta: string;
  /** Brand accent color. */
  primary: string;
  /** Rooftop sign background. */
  secondary: string;
  support: ImageSupport;
  /** Legacy sign style, replaced by `support`. */
  style?: "rooftop" | "facade" | "billboard";
  status: "draft" | "pending" | "active" | "rejected" | "suspended";
};
export type District = {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  x: number;
  z: number;
};
/** A plot (solar): the location. What stands on it lives in `buildings`. */
export type Property = {
  id: string;
  number: number;
  districtId: string;
  name: string;
  type: PropertyType;
  tier: Tier;
  x: number;
  z: number;
  height: number;
  width: number;
  depth: number;
  rotation: number;
  model: number;
  color: string;
  /** One-time price: "from" price for normal plots, premium price for skyscraper plots. */
  price: number;
  /** Legacy 30-day price map, removed by migratePlots. */
  prices?: Record<string, number>;
  /** "rental" is the historical name for direct one-time purchase. */
  sale: "rental" | "auction";
  featured: boolean;
  enabled: boolean;
  inventory?: "normal" | "skyscraper" | "public";
  reservedForBrands?: boolean;
  premiumNote?: "major_brands" | "auction_soon";
  description?: string;
  baseHeight?: number;
  current_property_value?: number;
  takeover_enabled?: boolean;
  takeover_blocked?: boolean;
  protection_until?: string;
  control_version?: number;
  last_takeover_amount?: number;
  last_takeover_at?: string;
  takeover_count?: number;
};
/** Ownership + advertisement of a private building. One-time payment: no expiry. */
export type Lease = {
  id: string;
  propertyId: string;
  email: string;
  ad: Ad;
  startsAt: string;
  /** Only present on legacy leases that were never migrated. */
  expiresAt?: string;
  legacyExpiresAt?: string;
  status: "active" | "expired";
  /** Demo seed showcase removed when the city started empty. */
  retired?: boolean;
  demo: boolean;
  autoRenew: boolean;
  transferable: boolean;
  presenceTier?: PresenceTier;
  upgradeHistory?: UpgradeRecord[];
  assignedBy?: string;
};
export type Building = {
  id: string;
  propertyId: string;
  kind: "private" | "public";
  tier: BuildingTier;
  /** Owner record for private buildings. */
  leaseId?: string;
  builtAt: string;
  upgradedAt?: string;
  previousTier?: BuildingTier;
  demo: boolean;
  /** Branding of city-owned buildings (no lease). */
  branding?: Ad;
};
export type Reservation = {
  id: string;
  propertyId: string;
  email: string;
  ad: Ad;
  /** Legacy lease length; 0 for one-time purchases. */
  days: number;
  amount: number;
  expiresAt: string;
  status: "reserved" | "paid" | "expired" | "conflict";
  purpose?: "takeover";
  expectedControllerId?: string;
  expectedPropertyValue?: number;
  expectedControlVersion?: number;
  sessionId?: string;
  renewalLeaseId?: string;
  upgradeLeaseId?: string;
  presenceTier?: PresenceTier;
  fromTier?: PresenceTier;
  accessHash: string;
};
export type Auction = {
  id: string;
  propertyId: string;
  endsAt: string;
  startingBid: number;
  increment: number;
  /** Legacy lease length of the winning placement. */
  days?: number;
  status: "live" | "awaiting_payment" | "settled" | "closed";
  winnerEmail?: string;
  reservationId?: string;
};
export type Bid = {
  id: string;
  auctionId: string;
  email: string;
  amount: number;
  createdAt: string;
};
export type Activity = {
  id: string;
  propertyId: string;
  brand: string;
  action: "claimed" | "renewed" | "upgraded" | "bid";
  createdAt: string;
  demo: boolean;
  amount?: number;
};
export type Transaction = {
  id: string;
  reservationId: string;
  amount: number;
  email: string;
  createdAt: string;
  provider: "demo" | "stripe";
  stripePaymentId?: string;
  outcome?: "fulfilled" | "refund_pending" | "refunded";
};
export type PropertyTakeover = {
  id: string;
  property_id: string;
  reservation_id: string;
  previous_controller_id: string;
  new_controller_id?: string;
  previous_value: number;
  takeover_amount: number;
  stripe_payment_id?: string;
  transaction_id: string;
  status: "completed" | "refund_pending" | "refunded";
  conflict_reason?: string;
  refund_id?: string;
  created_at: string;
};
export type EventName =
  | "city_impression"
  | "property_impression"
  | "property_open"
  | "external_link_click"
  | "share_clicked"
  | "claim_clicked"
  | "checkout_started"
  | "checkout_completed"
  | "claim_completed"
  | "renewal_completed"
  | "upgrade_completed"
  | "auction_bid";
export type Analytics = {
  id: string;
  propertyId: string;
  event: EventName;
  day: string;
  count: number;
};
export type Access = {
  id: string;
  email: string;
  expiresAt: string;
  used: boolean;
  kind: "link" | "session";
};
export type Mail = {
  id: string;
  email: string;
  subject: string;
  text: string;
  status: "pending" | "sent";
  createdAt: string;
};
export type Settings = {
  id: string;
  /** Legacy lease durations; unused since one-time payments. */
  durations?: number[];
  reservationMinutes: number;
  cityName: string;
  moderation: "automatic" | "review";
  pricingVersion?: number;
  plotsVersion?: number;
  brandingVersion?: number;
  inventoryVersion?: number;
  takeoverVersion?: number;
  takeoverEnabled?: boolean;
  takeoverMinimumIncrement?: number;
  takeoverProtectionHours?: number;
};
export type State = {
  properties: Property[];
  districts: District[];
  leases: Lease[];
  buildings: Building[];
  reservations: Reservation[];
  auctions: Auction[];
  bids: Bid[];
  activity: Activity[];
  transactions: Transaction[];
  analytics: Analytics[];
  access: Access[];
  mail: Mail[];
  settings: Settings[];
  propertyTakeovers: PropertyTakeover[];
};
export type ValueStep = {
  kind: "build" | "takeover";
  amount: number;
  at: string;
  brand: string;
};
export type PlotStatus =
  "available" | "reserved" | "claimed" | "auction" | "public";
export type BuildingView = {
  state: Exclude<BuildingState, "EMPTY">;
  tier: BuildingTier;
  kind: Building["kind"];
  floors: number;
  builtAt: string;
  upgradedAt?: string;
  previousTier?: BuildingTier;
};
export type PublicProperty = Property & {
  status: PlotStatus;
  building: BuildingView | null;
  ad?: Ad;
  views: number;
  presenceTier?: PresenceTier;
  /** Real control history of the location: initial purchase, then completed takeovers. */
  valueHistory?: ValueStep[];
  takeover?: {
    eligible: boolean;
    open: boolean;
    minimumOffer: number;
    protectionHours: number;
    reason?: string;
  };
  auction?: Auction & {
    currentBid: number;
    nextBid: number;
    bidders: number;
    history: { amount: number; createdAt: string; bidder: string }[];
  };
};
export type CityData = {
  demo: boolean;
  /** Recorded city visits and an optional presence provider; null means not connected. */
  metrics?: CityMetrics;
  properties: PublicProperty[];
  districts: District[];
  activity: Activity[];
  stats: {
    plots: number;
    built: number;
    privateBuilt: number;
    publicBuilt: number;
    available: number;
    reserved: number;
    builtPercent: number;
    owners: number;
    builtToday: number;
    auctions: number;
  };
};
export type CityMetrics = {
  totalVisits: number;
  online: number | null;
  onlineSource: "live" | "demo" | "unavailable";
};
