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
  prices: Record<string, number>;
  sale: "rental" | "auction";
  featured: boolean;
  enabled: boolean;
  inventory?: "normal" | "skyscraper";
  reservedForBrands?: boolean;
  baseHeight?: number;
};
export type Lease = {
  id: string;
  propertyId: string;
  email: string;
  ad: Ad;
  startsAt: string;
  expiresAt: string;
  status: "active" | "expired";
  demo: boolean;
  autoRenew: boolean;
  transferable: boolean;
  presenceTier?: PresenceTier;
  upgradeHistory?: UpgradeRecord[];
  assignedBy?: string;
};
export type Reservation = {
  id: string;
  propertyId: string;
  email: string;
  ad: Ad;
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
  days: number;
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
  durations: number[];
  reservationMinutes: number;
  cityName: string;
  moderation: "automatic" | "review";
  pricingVersion?: number;
};
export type State = {
  properties: Property[];
  districts: District[];
  leases: Lease[];
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
export type PublicProperty = Property & {
  status: "available" | "reserved" | "claimed" | "auction";
  ad?: Ad;
  expiresAt?: string;
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
  durations: number[];
  stats: {
    total: number;
    claimed: number;
    available: number;
    reserved: number;
    advertisers: number;
    occupancy: number;
    claimsToday: number;
    auctions: number;
  };
};
