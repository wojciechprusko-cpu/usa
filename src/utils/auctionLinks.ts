import { CarAuction } from '../types';

/**
 * Returns the DIRECT official auction lot URL on Copart or IAAI.
 * Links directly to the specific car lot page:
 * - Copart: https://www.copart.com/lot/<lotNumber>
 * - IAAI: https://www.iaai.com/VehicleDetail/<lotNumber>
 */
export function getDirectAuctionUrl(car: {
  auctionPlatform: string;
  lotNumber?: string;
  auctionUrl?: string;
  vin?: string;
}): string {
  // If car already has a direct lot link, return it
  if (car.auctionUrl && (car.auctionUrl.includes('/lot/') || car.auctionUrl.includes('/VehicleDetail/') || car.auctionUrl.includes('/vehicledetail/'))) {
    return car.auctionUrl;
  }

  const isCopart = (car.auctionPlatform || '').toLowerCase().includes('copart');
  const lot = car.lotNumber || '00000000';

  if (isCopart) {
    return `https://www.copart.com/lot/${lot}`;
  } else {
    return `https://www.iaai.com/VehicleDetail/${lot}`;
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

