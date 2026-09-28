import { CarAuction, ImportCostsBreakdown } from '../types';

export const DEFAULT_USD_PLN = 3.98;
export const DEFAULT_EUR_PLN = 4.28;

export interface CustomShippingInput {
  inlandTransportUsd?: number;
  oceanFreightUsd?: number;
  portHandlingEur?: number;
  transportToPolandPln?: number;
}

export function calculateImportCosts(
  car: CarAuction,
  customBidUsd?: number,
  customRepairPln?: number,
  customUsdPln: number = DEFAULT_USD_PLN,
  viaGermany: boolean = true,
  customShipping?: CustomShippingInput
): ImportCostsBreakdown {
  const bidUsd = customBidUsd !== undefined ? customBidUsd : car.estimatedHammerUsd;
  const exchangeRateUsdPln = customUsdPln;
  const bidPln = Math.round(bidUsd * exchangeRateUsdPln);

  // Copart / IAAI progressive buyer fee estimate
  let auctionFeeUsd = 650;
  if (bidUsd > 15000) auctionFeeUsd = 950;
  else if (bidUsd > 8000) auctionFeeUsd = 800;
  else if (bidUsd > 4000) auctionFeeUsd = 700;

  // Inland transport in USA based on port & custom override
  let inlandTransportUsd = customShipping?.inlandTransportUsd;
  if (inlandTransportUsd === undefined) {
    inlandTransportUsd = 450;
    if (car.departurePort === 'Los Angeles') inlandTransportUsd = 750;
    else if (car.departurePort === 'Houston') inlandTransportUsd = 550;
    else if (car.departurePort === 'New York / New Jersey') inlandTransportUsd = 350;
    
    // Add forklift/inoperable fee if car is not Run & Drive
    if (car.driveCondition !== 'Run & Drive') {
      inlandTransportUsd += 150;
    }
  }

  // Ocean shipping in 40ft container (share) or RORO to Bremerhaven
  let oceanFreightUsd = customShipping?.oceanFreightUsd;
  if (oceanFreightUsd === undefined) {
    oceanFreightUsd = 1350;
    if (car.departurePort === 'Los Angeles') oceanFreightUsd = 1850;
    else if (car.departurePort === 'Houston') oceanFreightUsd = 1550;
  }

  const totalUsPortUsd = bidUsd + auctionFeeUsd + inlandTransportUsd + oceanFreightUsd;

  // Port handling in Bremerhaven / Rotterdam
  const portHandlingEur = customShipping?.portHandlingEur !== undefined ? customShipping.portHandlingEur : 420;
  const portHandlingPln = Math.round(portHandlingEur * DEFAULT_EUR_PLN);

  // Total CIF value for Customs Duty (Cło = 10%)
  const cifUsd = totalUsPortUsd;
  const cifPln = Math.round(cifUsd * exchangeRateUsdPln);
  const customsDutyRate = 0.10; // 10%
  const customsDutyPln = Math.round(cifPln * customsDutyRate);

  // Polish Excise Tax (Akcyza): 3.1% <= 2.0L, 18.6% > 2.0L, 0% Electric
  let exciseTaxRate = 0.031;
  if (car.fuelType === 'Elektryczny') {
    exciseTaxRate = 0;
  } else if (car.engineCapacityCc > 2000) {
    exciseTaxRate = 0.186;
  }
  // Akcyza naliczana od wartości celnej + cło
  const exciseTaxPln = Math.round((cifPln + customsDutyPln) * exciseTaxRate);

  // VAT (19% w Niemczech przy odprawie tranzytowej lub 23% w PL)
  const vatRate = viaGermany ? 0.19 : 0.23;
  const vatBasePln = cifPln + customsDutyPln + portHandlingPln;
  const vatPln = Math.round(vatBasePln * vatRate);

  // Transport z Bremerhaven do Polski (laweta pod dom)
  const transportToPolandPln = customShipping?.transportToPolandPln !== undefined ? customShipping.transportToPolandPln : 1800;

  // Całkowity koszt dostawy (lądowy USA + ocean + terminal + laweta PL)
  const totalShippingPln = Math.round((inlandTransportUsd + oceanFreightUsd) * exchangeRateUsdPln) + portHandlingPln + transportToPolandPln;
  const totalShippingUsd = Math.round(totalShippingPln / exchangeRateUsdPln);

  // Agencja celna, dokumenty, tłumaczenia, rzeczoznawca
  const documentsAndAgencyPln = 1200;

  // Adaptacja (światła asymetryczne, kodowanie fal radia EU, przeciwmgielne, badanie techniczne)
  const adaptationPln = 2500;

  // Szacowana naprawa blacharsko-lakiernicza
  const estimatedRepairPln = customRepairPln !== undefined ? customRepairPln : car.estimatedRepairPln;

  // Koszt całkowity
  const totalLandedCostPln =
    cifPln +
    customsDutyPln +
    exciseTaxPln +
    vatPln +
    portHandlingPln +
    transportToPolandPln +
    documentsAndAgencyPln +
    adaptationPln +
    estimatedRepairPln;

  const polishMarketValuePln = car.polishMarketValuePln;
  const estimatedProfitPln = polishMarketValuePln - totalLandedCostPln;
  const roiPercentage = Math.round((estimatedProfitPln / totalLandedCostPln) * 100);

  return {
    bidUsd,
    exchangeRateUsdPln,
    bidPln,
    auctionFeeUsd,
    inlandTransportUsd,
    oceanFreightUsd,
    totalUsPortUsd,
    portHandlingEur,
    customsDutyRate,
    customsDutyPln,
    exciseTaxRate,
    exciseTaxPln,
    vatRate,
    vatPln,
    transportToPolandPln,
    documentsAndAgencyPln,
    estimatedRepairPln,
    adaptationPln,
    totalLandedCostPln,
    polishMarketValuePln,
    estimatedProfitPln,
    roiPercentage,
    totalShippingPln,
    totalShippingUsd
  };
}

export function formatPln(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
}
