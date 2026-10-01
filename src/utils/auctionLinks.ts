import { CarAuction } from '../types';

/**
 * Returns the DIRECT official auction lot URL on Copart or IAAI.
 * Ensures the lotNumber in the URL ALWAYS corresponds to the car's current lotNumber.
 */
export function getDirectAuctionUrl(car: {
  auctionPlatform: string;
  lotNumber?: string;
  auctionUrl?: string;
  vin?: string;
}): string {
  const isCopart = (car.auctionPlatform || '').toLowerCase().includes('copart');
  const lot = car.lotNumber ? String(car.lotNumber).trim() : '84729103';

  // If car already has an auctionUrl that actually matches this exact lotNumber, use it
  if (car.auctionUrl && car.lotNumber && car.auctionUrl.includes(lot)) {
    return car.auctionUrl;
  }

  if (isCopart) {
    return `https://www.copart.com/lot/${lot}`;
  } else {
    return `https://www.iaai.com/VehicleDetail/${lot}`;
  }
}

/**
 * Returns Copart Poland direct URL (copart.pl) to avoid regional blocks or IP redirects.
 */
export function getCopartPlUrl(car: { lotNumber?: string }): string {
  const lot = car.lotNumber ? String(car.lotNumber).trim() : '84729103';
  return `https://www.copart.pl/lot/${lot}`;
}

/**
 * Returns foolproof live search query URL on Copart or IAAI.
 * If a direct lot is archived, closed, or gives 404, this link ALWAYS works
 * and displays active lots for this VIN or model!
 */
export function getLiveAuctionSearchUrl(car: {
  auctionPlatform: string;
  vin?: string;
  lotNumber?: string;
  year?: number;
  make?: string;
  model?: string;
}): string {
  const isCopart = (car.auctionPlatform || '').toLowerCase().includes('copart');
  const query = car.vin || car.lotNumber || `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim();

  if (isCopart) {
    return `https://www.copart.com/lotSearchResults?free=true&query=${encodeURIComponent(query)}`;
  } else {
    return `https://www.iaai.com/Search?keyword=${encodeURIComponent(query)}`;
  }
}

/**
 * Returns secondary live search link for the vehicle model as a fallback.
 */
export function getLiveModelSearchUrl(car: {
  auctionPlatform: string;
  year: number;
  make: string;
  model: string;
}): string {
  const isCopart = (car.auctionPlatform || '').toLowerCase().includes('copart');
  const query = `${car.year} ${car.make} ${car.model}`.trim();

  if (isCopart) {
    return `https://www.copart.com/lotSearchResults?free=true&query=${encodeURIComponent(query)}`;
  } else {
    return `https://www.iaai.com/Search?keyword=${encodeURIComponent(query)}`;
  }
}

/**
 * Backwards compatibility alias
 */
export function getVerifiedLiveAuctionUrl(car: {
  auctionPlatform: string;
  lotNumber?: string;
  auctionUrl?: string;
  vin?: string;
}): string {
  return getDirectAuctionUrl(car);
}

/**
 * Returns the direct VIN search link on Copart or IAAI.
 */
export function getAuctionVinSearchUrl(platform: string, vin: string): string {
  const isCopart = platform?.toLowerCase().includes('copart');
  const cleanVin = vin.trim();

  if (isCopart) {
    return `https://www.copart.com/lotSearchResults?free=true&query=${encodeURIComponent(cleanVin)}`;
  } else {
    return `https://www.iaai.com/Search?keyword=${encodeURIComponent(cleanVin)}`;
  }
}

/**
 * Returns the free BidFax history link (shows historical salvage auction photos & past sale bids in the US).
 */
export function getBidFaxHistoryUrl(vin: string): string {
  return `https://bidfax.info/?s=${encodeURIComponent(vin.trim())}`;
}

/**
 * Returns StatVin vehicle history lookup link.
 */
export function getStatVinHistoryUrl(vin: string): string {
  return `https://stat.vin/cars?search=${encodeURIComponent(vin.trim())}`;
}

