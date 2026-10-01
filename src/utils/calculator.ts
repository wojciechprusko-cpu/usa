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
  const isMotorcycle = car.vehicleType === 'motorcycle';
  const bidUsd = customBidUsd !== undefined ? customBidUsd : car.estimatedHammerUsd;
  const exchangeRateUsdPln = customUsdPln;
  const bidPln = Math.round(bidUsd * exchangeRateUsdPln);

  // Copart / IAAI progressive buyer fee estimate
  let auctionFeeUsd = 650;
  if (isMotorcycle) {
    auctionFeeUsd = 450;
    if (bidUsd > 10000) auctionFeeUsd = 650;
    else if (bidUsd > 5000) auctionFeeUsd = 550;
  } else {
    if (bidUsd > 15000) auctionFeeUsd = 950;
    else if (bidUsd > 8000) auctionFeeUsd = 800;
    else if (bidUsd > 4000) auctionFeeUsd = 700;
  }

  // Inland transport in USA based on port & custom override
  let inlandTransportUsd = customShipping?.inlandTransportUsd;
  if (inlandTransportUsd === undefined) {
    if (isMotorcycle) {
      // Motocykle w USA mają niższy koszt transportu lądowego
      inlandTransportUsd = 280;
      if (car.departurePort === 'Los Angeles') inlandTransportUsd = 450;
      else if (car.departurePort === 'Houston') inlandTransportUsd = 350;
      else if (car.departurePort === 'New York / New Jersey') inlandTransportUsd = 220;

      if (car.driveCondition !== 'Run & Drive') {
        inlandTransportUsd += 60;
      }
    } else {
      inlandTransportUsd = 450;
      if (car.departurePort === 'Los Angeles') inlandTransportUsd = 750;
      else if (car.departurePort === 'Houston') inlandTransportUsd = 550;
      else if (car.departurePort === 'New York / New Jersey') inlandTransportUsd = 350;
      
      // Add forklift/inoperable fee if car is not Run & Drive
      if (car.driveCondition !== 'Run & Drive') {
        inlandTransportUsd += 150;
      }
    }
  }

  // Ocean shipping (kontener współdzielony / klatka motocyklowa crating)
  let oceanFreightUsd = customShipping?.oceanFreightUsd;
  if (oceanFreightUsd === undefined) {
    if (isMotorcycle) {
      // Motocykl w skrzyni transportowej / na palecie w kontenerze
      oceanFreightUsd = 650;
      if (car.departurePort === 'Los Angeles') oceanFreightUsd = 850;
      else if (car.departurePort === 'Houston') oceanFreightUsd = 750;
    } else {
      oceanFreightUsd = 1350;
      if (car.departurePort === 'Los Angeles') oceanFreightUsd = 1850;
      else if (car.departurePort === 'Houston') oceanFreightUsd = 1550;
    }
  }

  const totalUsPortUsd = bidUsd + auctionFeeUsd + inlandTransportUsd + oceanFreightUsd;

  // Port handling in Bremerhaven / Rotterdam
  const portHandlingEur = customShipping?.portHandlingEur !== undefined 
    ? customShipping.portHandlingEur 
    : (isMotorcycle ? 250 : 420);
  const portHandlingPln = Math.round(portHandlingEur * DEFAULT_EUR_PLN);

  // Total CIF value for Customs Duty
  // Samochody z USA: Cło = 10%
  // Motocykle z USA: Cło = 6% (kod CN 8711)
  const cifUsd = totalUsPortUsd;
  const cifPln = Math.round(cifUsd * exchangeRateUsdPln);
  const customsDutyRate = isMotorcycle ? 0.06 : 0.10;
  const customsDutyPln = Math.round(cifPln * customsDutyRate);

  // Polish Excise Tax (Akcyza):
  // Motocykle w Polsce: ZWOLNIONE Z AKCYZY (0%)!
  // Samochody: 3.1% <= 2.0L, 18.6% > 2.0L, 0% Elektryczne
  let exciseTaxRate = 0.031;
  if (isMotorcycle) {
    exciseTaxRate = 0.0; // 0% zwolnienie z akcyzy!
  } else if (car.fuelType === 'Elektryczny') {
    exciseTaxRate = 0.0;
  } else if (car.engineCapacityCc > 2000) {
    exciseTaxRate = 0.186;
  }
  // Akcyza naliczana od wartości celnej + cło
  const exciseTaxPln = Math.round((cifPln + customsDutyPln) * exciseTaxRate);

  // VAT (19% w Niemczech przy odprawie tranzytowej lub 23% w PL)
  const vatRate = viaGermany ? 0.19 : 0.23;
  const vatBasePln = cifPln + customsDutyPln + portHandlingPln;
  const vatPln = Math.round(vatBasePln * vatRate);

  // Transport z Bremerhaven do Polski (laweta/bus pod dom)
  const defaultTransportToPl = isMotorcycle ? 850 : 1800;
  const transportToPolandPln = customShipping?.transportToPolandPln !== undefined ? customShipping.transportToPolandPln : defaultTransportToPl;

  // Całkowity koszt dostawy (lądowy USA + ocean + terminal + laweta/bus PL)
  const totalShippingPln = Math.round((inlandTransportUsd + oceanFreightUsd) * exchangeRateUsdPln) + portHandlingPln + transportToPolandPln;
  const totalShippingUsd = Math.round(totalShippingPln / exchangeRateUsdPln);

  // Agencja celna, dokumenty, tłumaczenia, rzeczoznawca
  const documentsAndAgencyPln = isMotorcycle ? 900 : 1200;

  // Adaptacja (światła asymetryczne/symetryczne, badanie techniczne)
  const adaptationPln = isMotorcycle ? 800 : 2500;

  // Szacowana naprawa blacharsko-lakiernicza / mechaniczna
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
    totalShippingUsd,
    isMotorcycle
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
