export interface CarAuction {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  vehicleType?: 'car' | 'motorcycle'; // Samochód lub Motocykl
  engine: string;
  engineCapacityCc: number; // e.g. 1998 for 2.0L, 5000 for 5.0L, 1868 for Harley 114
  fuelType: 'Benzyna' | 'Diesel' | 'Hybryda' | 'Elektryczny';
  mileageMiles: number;
  currentBidUsd: number;
  buyNowUsd?: number;
  estimatedHammerUsd: number;
  auctionPlatform: 'Copart' | 'IAAI' | 'Manheim' | 'Bring a Trailer';
  lotNumber: string;
  auctionUrl: string;
  auctionEndTime: string; // ISO string or relative
  locationState: string; // e.g. 'NJ - Somerville'
  departurePort: 'New York / New Jersey' | 'Savannah' | 'Houston' | 'Los Angeles' | 'Miami';
  primaryDamage: string; // e.g. 'Przód (Front End)', 'Bok (Side)', 'Grad (Hail)', 'Zarysowania (Minor)'
  secondaryDamage?: string;
  lossType: 'Kolizja' | 'Gradobicie' | 'Kradzież (Odzyskany)' | 'Wandalizm';
  titleType: 'Clean Title' | 'Salvage Title' | 'Certificate of Destruction';
  driveCondition: 'Run & Drive' | 'Engine Starts' | 'Enhanced Vehicles' | 'Stationary';
  keysPresent: boolean;
  airbagsDeployed: boolean;
  images: string[];
  polishMarketValuePln: number; // Cena takiego samego bezwypadkowego w PL na Otomoto
  estimatedRepairPln: number;
  aiDealScore: number; // 0 - 100
  aiRecommendation: string;
  aiPros: string[];
  aiCons: string[];
  isHotDeal: boolean;
  notificationSent?: boolean;
  status?: 'ACTIVE' | 'ENDING_SOON' | 'SOLD' | 'ENDED' | 'UNAVAILABLE';
  bidCount?: number;
  lastBidChange?: number;
  lastUpdatedTimestamp?: number;
}

export interface RemovedAuctionLog {
  id: string;
  carTitle: string;
  lotNumber: string;
  vin: string;
  auctionPlatform: string;
  reason: 'Czas licytacji minął' | 'Sprzedane na aukcji (Kup Teraz)' | 'Wycofane przez dom aukcyjny' | 'Zakończona licytacja';
  removedAt: string;
  finalBidUsd: number;
}

export interface AiShippingCalculation {
  vehicleType?: 'car' | 'motorcycle';
  originState: string;
  departurePort: string;
  destinationPort: string;
  destinationCityPoland: string;
  inlandTransportUsd: number;
  oceanFreightUsd: number;
  portHandlingEur: number;
  transportToPolandPln: number;
  totalShippingPln: number;
  totalShippingUsd: number;
  transitDaysEstimate: string;
  carrierType: string;
  requiresForklift: boolean;
  aiLogisticsNotes: string;
}

export interface ImportCostsBreakdown {
  bidUsd: number;
  exchangeRateUsdPln: number;
  bidPln: number;
  auctionFeeUsd: number;
  inlandTransportUsd: number;
  oceanFreightUsd: number;
  totalUsPortUsd: number;
  portHandlingEur: number;
  customsDutyRate: number; // 10% auta, 6% motocykle
  customsDutyPln: number;
  exciseTaxRate: number; // 3.1% or 18.6% (auta), 0% motocykle
  exciseTaxPln: number;
  vatRate: number; // 19% (Bremerhaven) or 23% (Polska)
  vatPln: number;
  transportToPolandPln: number;
  documentsAndAgencyPln: number;
  estimatedRepairPln: number;
  adaptationPln: number; // światła europejskie, przegląd, tłumaczenia
  totalLandedCostPln: number;
  polishMarketValuePln: number;
  estimatedProfitPln: number;
  roiPercentage: number;
  totalShippingPln: number;
  totalShippingUsd: number;
  shippingDetails?: AiShippingCalculation;
  isMotorcycle?: boolean;
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  targetPhone: string;
  carTitle: string;
  vin: string;
  lotNumber: string;
  auctionPlatform: string;
  auctionUrl: string;
  estimatedProfitPln: number;
  dealScore: number;
  status: 'Wysłano SMS (Twilio)' | 'Wysłano SMS (SMSAPI)' | 'Wysłano SMS' | 'Dostarczono' | 'Kliknięto' | 'Brak klucza bramki GSM' | 'Błąd bramki';
  channel: 'SMS' | 'WhatsApp' | 'Push Alert';
  messageText: string;
  gatewayProvider?: 'Twilio' | 'SMSAPI' | 'Aplikacja GSM / Telefon' | 'Symulacja';
  gatewayMessageId?: string;
  smsDirectUri?: string;
  whatsappUri?: string;
}

export interface SmsGatewayConfig {
  targetPhone: string;
  twilioConfigured: boolean;
  smsApiConfigured: boolean;
  activeProvider: 'Twilio' | 'SMSAPI' | 'None';
  geminiConfigured: boolean;
}

export interface FilterState {
  searchQuery: string;
  vehicleType: 'all' | 'car' | 'motorcycle';
  make: string;
  platform: string;
  minYear: number;
  maxYear: number;
  maxBidUsd: number;
  minDealScore: number;
  onlyRunAndDrive: boolean;
  maxExciseOnly: boolean; // tylko silniki do 2.0L lub motocykle (akcyza <= 3.1% lub 0%)
  sortBy: 'score' | 'profit' | 'endingSoon' | 'priceAsc';
}

export interface GoogleSheetSyncItem {
  id: string;
  car: CarAuction;
  syncedAt: string;
}
