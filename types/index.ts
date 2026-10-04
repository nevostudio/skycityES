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
export type Ad = {
  brand: string;
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
  primary: string;
  secondary: string;
  style: "rooftop" | "facade" | "billboard";
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
  status: "reserved" | "paid" | "expired";
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
  auction?: Auction & {
    currentBid: number;
    nextBid: number;
    bidders: number;
    history: { amount: number; createdAt: string; bidder: string }[];
  };
};
export type CityData = {
  demo: boolean;
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
