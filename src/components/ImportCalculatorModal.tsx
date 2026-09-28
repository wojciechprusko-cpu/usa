import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calculator, 
  ArrowRight, 
  Check, 
  Info, 
  ShieldCheck, 
  DollarSign, 
  ExternalLink,
  Truck,
  Sparkles,
  MapPin,
  RefreshCw,
  Anchor,
  Navigation,
  Clock,
  AlertCircle
} from 'lucide-react';
import { CarAuction, AiShippingCalculation } from '../types';
import { calculateImportCosts, formatPln, formatUsd, DEFAULT_USD_PLN } from '../utils/calculator';
import { getDirectAuctionUrl } from '../utils/auctionLinks';

interface ImportCalculatorModalProps {
  car: CarAuction | null;
  isOpen: boolean;
  onClose: () => void;
}

const POLISH_CITIES = ['Warszawa', 'Poznań', 'Wrocław', 'Kraków', 'Gdańsk', 'Katowice', 'Rzeszów', 'Szczecin'];

export const ImportCalculatorModal: React.FC<ImportCalculatorModalProps> = ({
  car,
  isOpen,
  onClose
}) => {
  // Default values
  const [bidUsd, setBidUsd] = useState(car?.estimatedHammerUsd ?? 0);
  const [repairPln, setRepairPln] = useState(car?.estimatedRepairPln ?? 0);
  const [usdRate, setUsdRate] = useState(DEFAULT_USD_PLN);
  const [viaGermany, setViaGermany] = useState(true);

  // AI Shipping & Delivery State
  const [destinationCity, setDestinationCity] = useState('Warszawa');
  const [isForkliftRequired, setIsForkliftRequired] = useState(car?.driveCondition !== 'Run & Drive');
  const [aiShipping, setAiShipping] = useState<AiShippingCalculation | null>(null);
  const [isLoadingAiShipping, setIsLoadingAiShipping] = useState(false);
  const [inlandTransportUsd, setInlandTransportUsd] = useState<number | undefined>(undefined);
  const [oceanFreightUsd, setOceanFreightUsd] = useState<number | undefined>(undefined);
  const [transportToPolandPln, setTransportToPolandPln] = useState<number | undefined>(undefined);
  const [portHandlingEur, setPortHandlingEur] = useState<number | undefined>(undefined);

  // Helper to fetch AI shipping calculation
  const fetchAiShipping = async (city = destinationCity, forklift = isForkliftRequired) => {
    if (!car) return;
    setIsLoadingAiShipping(true);
    try {
      const res = await fetch('/api/ai-calculate-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: car.year,
          make: car.make,
          model: car.model,
          trim: car.trim,
          locationState: car.locationState,
          departurePort: car.departurePort,
          driveCondition: car.driveCondition,
          primaryDamage: car.primaryDamage,
          destinationCity: city,
          isForkliftRequired: forklift,
          usdRate,
        }),
      });
      const data = await res.json();
      if (data && data.totalShippingPln) {
        setAiShipping(data);
        setInlandTransportUsd(data.inlandTransportUsd);
        setOceanFreightUsd(data.oceanFreightUsd);
        setTransportToPolandPln(data.transportToPolandPln);
        setPortHandlingEur(data.portHandlingEur);
      }
    } catch (err) {
      console.warn('Błąd kalkulacji AI shipping:', err);
    } finally {
      setIsLoadingAiShipping(false);
    }
  };

  useEffect(() => {
    if (car && isOpen) {
      setBidUsd(car.estimatedHammerUsd);
      setRepairPln(car.estimatedRepairPln);
      const forklift = car.driveCondition !== 'Run & Drive';
      setIsForkliftRequired(forklift);
      fetchAiShipping(destinationCity, forklift);
    }
  }, [car, isOpen]);

  if (!isOpen || !car) return null;

  const calc = calculateImportCosts(car, bidUsd, repairPln, usdRate, viaGermany, {
    inlandTransportUsd,
    oceanFreightUsd,
    portHandlingEur,
    transportToPolandPln
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-slate-900 border border-slate-750 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-white my-4 sm:my-8 max-h-[92vh] overflow-y-auto"
        id="import-calculator-modal"
      >
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Kalkulator Importu z USA do Polski</span>
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  {car.year} {car.make} {car.model} {car.trim} (VIN: <span className="font-mono text-slate-300">{car.vin}</span>)
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Default Option Inputs */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            1. Domyślne parametry zakupu i naprawy
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-850 p-3 rounded-xl border border-slate-750">
            <div>
              <label className="text-[11px] text-slate-400 block font-medium mb-1">
                Kwota licytacji (USD)
              </label>
              <input
                type="number"
                value={bidUsd}
                onChange={(e) => setBidUsd(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block font-medium mb-1">
                Szacowana naprawa (PLN)
              </label>
              <input
                type="number"
                value={repairPln}
                onChange={(e) => setRepairPln(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block font-medium mb-1">
                Kurs USD / PLN
              </label>
              <input
                type="number"
                step="0.01"
                value={usdRate}
                onChange={(e) => setUsdRate(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Port & Customs Route Option */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-800/60 rounded-xl border border-slate-750 text-xs">
          <span className="text-slate-300">
            Ścieżka celna: <strong>{viaGermany ? 'Bremerhaven (Niemcy) - VAT 19%' : 'Gdynia (Polska) - VAT 23%'}</strong>
          </span>
          <button
            onClick={() => setViaGermany(!viaGermany)}
            className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold active:scale-95 transition-all"
          >
            Przełącz na {viaGermany ? 'Polskę (23%)' : 'Niemcy (19%)'}
          </button>
        </div>

        {/* 2. DEDICATED AI SHIPPING & DELIVERY CALCULATION SECTION */}
        <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-3.5 sm:p-4 space-y-3.5 shadow-lg">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                  <span>AI Przeliczenie Kosztu Dostawy & Spedycji</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-normal">
                    Gemini 3.8 Flash
                  </span>
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-300">
                  Przeliczenie logistyki: odbiór z placu w USA, fracht morski, odprawa portowa i autolaweta pod dom w Polsce.
                </p>
              </div>
            </div>

            {/* Re-calculate Button */}
            <button
              onClick={() => fetchAiShipping(destinationCity, isForkliftRequired)}
              disabled={isLoadingAiShipping}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0"
              title="Przelicz ponownie koszty dostawy przez silnik AI"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAiShipping ? 'animate-spin' : ''}`} />
              <span>{isLoadingAiShipping ? 'AI przelicza...' : 'Przelicz przez AI'}</span>
            </button>
          </div>

          {/* Destination & Forklift Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/80 p-2.5 sm:p-3 rounded-xl border border-slate-750 text-xs">
            
            {/* Destination in Poland */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1 mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Miasto docelowe dostawy w Polsce:</span>
              </label>
              
              <div className="flex items-center gap-1.5 mb-1.5">
                <input
                  type="text"
                  value={destinationCity}
                  onChange={(e) => setDestinationCity(e.target.value)}
                  onBlur={() => fetchAiShipping(destinationCity, isForkliftRequired)}
                  placeholder="np. Warszawa, Poznań, Wrocław..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* City quick chips */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {POLISH_CITIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setDestinationCity(c);
                      fetchAiShipping(c, isForkliftRequired);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition-colors ${
                      destinationCity === c
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle handling condition */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                Stan do załadunku w USA (Copart/IAAI):
              </label>

              <button
                type="button"
                onClick={() => {
                  const nextVal = !isForkliftRequired;
                  setIsForkliftRequired(nextVal);
                  fetchAiShipping(destinationCity, nextVal);
                }}
                className={`w-full p-2 rounded-lg border text-left text-xs transition-colors flex items-start gap-2 ${
                  isForkliftRequired
                    ? 'bg-amber-950/80 border-amber-500/80 text-amber-200'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <div className={`w-4 h-4 rounded mt-0.5 shrink-0 flex items-center justify-center border ${
                  isForkliftRequired ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-600'
                }`}>
                  {isForkliftRequired && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <span className="font-bold block text-white text-[11px]">
                    {isForkliftRequired ? 'Wymaga wózka widłowego (Forklift fee +$150)' : 'Auto toczy się samodzielnie (Run & Drive)'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isForkliftRequired 
                      ? 'Opłata za załadunek auta niesprawnego/zablokowanego na lawecie w USA' 
                      : 'Brak dopłaty za wózek widłowy na placu aukcyjnym'}
                  </span>
                </div>
              </button>
            </div>

          </div>

          {/* AI Itemized Delivery Stage Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            
            {/* Step 1: Inland USA */}
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">1. Lądowy USA</span>
              <strong className="text-white text-xs block mt-0.5 font-mono">
                {formatUsd(calc.inlandTransportUsd)}
              </strong>
              <span className="text-[10px] text-amber-400 font-semibold block">
                ≈ {formatPln(calc.inlandTransportUsd * usdRate)}
              </span>
              <span className="text-[9px] text-slate-400 truncate block mt-0.5" title={car.locationState}>
                {car.locationState} &rarr; {car.departurePort}
              </span>
            </div>

            {/* Step 2: Ocean Container */}
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">2. Fracht morski</span>
              <strong className="text-white text-xs block mt-0.5 font-mono">
                {formatUsd(calc.oceanFreightUsd)}
              </strong>
              <span className="text-[10px] text-amber-400 font-semibold block">
                ≈ {formatPln(calc.oceanFreightUsd * usdRate)}
              </span>
              <span className="text-[9px] text-slate-400 truncate block mt-0.5">
                Kontener 40ft &rarr; UE
              </span>
            </div>

            {/* Step 3: Port Terminal Bremerhaven */}
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">3. Rozładunek port</span>
              <strong className="text-white text-xs block mt-0.5 font-mono">
                €{calc.portHandlingEur} EUR
              </strong>
              <span className="text-[10px] text-amber-400 font-semibold block">
                ≈ {formatPln(calc.portHandlingEur * 4.28)}
              </span>
              <span className="text-[9px] text-slate-400 truncate block mt-0.5">
                Terminal & T1 Bremerhaven
              </span>
            </div>

            {/* Step 4: Tow to Poland */}
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">4. Laweta pod dom</span>
              <strong className="text-emerald-400 text-xs block mt-0.5 font-mono font-bold">
                {formatPln(calc.transportToPolandPln)}
              </strong>
              <span className="text-[10px] text-emerald-500 font-semibold block">
                Bezpośrednio pod dom
              </span>
              <span className="text-[9px] text-slate-300 truncate block mt-0.5 font-bold">
                &rarr; {destinationCity}
              </span>
            </div>

          </div>

          {/* Grand Total Delivery Callout Bar */}
          <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300 block">
                Łączny Koszt Dostawy Pod Dom (Przeliczony przez AI):
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-lg sm:text-xl font-black text-amber-300 font-mono tracking-tight">
                  {formatPln(calc.totalShippingPln)}
                </span>
                <span className="text-xs text-amber-200/80 font-mono">
                  (${formatUsd(calc.totalShippingUsd)} USD)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs border-t sm:border-t-0 sm:border-l border-amber-500/30 pt-2 sm:pt-0 sm:pl-3">
              <div>
                <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Czas tranzytu (ETA):</span>
                </span>
                <strong className="text-white text-[11px] sm:text-xs">
                  {aiShipping?.transitDaysEstimate || '28 - 35 dni roboczych'}
                </strong>
              </div>
            </div>
          </div>

          {/* AI Logistics Advice Snippet */}
          {aiShipping?.aiLogisticsNotes && (
            <div className="text-[11px] text-slate-300 bg-slate-900/90 p-2.5 rounded-xl border border-slate-750 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-amber-400 font-bold block text-[10px] uppercase tracking-wider">
                  Wskazówka logistyczna AI:
                </span>
                <p className="leading-relaxed text-slate-300">{aiShipping.aiLogisticsNotes}</p>
              </div>
            </div>
          )}

        </div>

        {/* 3. Detailed Itemized Table */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Szczegółowy Wykaz Kosztów (Pełna Ścieżka)
            </h4>
            <span className="text-[11px] text-emerald-400 font-medium">
              Uwzględnia koszt dostawy pod dom
            </span>
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 divide-y divide-slate-800/80">
            
            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-300">1. Cena zakupu auta na aukcji ({formatUsd(bidUsd)})</span>
              <span className="font-semibold text-white">{formatPln(calc.bidPln)}</span>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-300">2. Prowizja domu aukcyjnego {car.auctionPlatform} ({formatUsd(calc.auctionFeeUsd)})</span>
              <span className="font-semibold text-white">{formatPln(calc.auctionFeeUsd * usdRate)}</span>
            </div>

            {/* Shipping stage: Inland USA */}
            <div className="p-2.5 flex items-center justify-between bg-amber-500/5">
              <span className="text-amber-200 flex items-center gap-1.5">
                <Truck className="w-3 h-3 text-amber-400" />
                <span>3. Transport lądowy USA do portu ({car.departurePort}) [AI Dostawa]</span>
              </span>
              <span className="font-semibold text-amber-300">{formatPln(calc.inlandTransportUsd * usdRate)}</span>
            </div>

            {/* Shipping stage: Ocean */}
            <div className="p-2.5 flex items-center justify-between bg-amber-500/5">
              <span className="text-amber-200 flex items-center gap-1.5">
                <Anchor className="w-3 h-3 text-amber-400" />
                <span>4. Fracht morski w kontenerze do portu europejskiego [AI Dostawa]</span>
              </span>
              <span className="font-semibold text-amber-300">{formatPln(calc.oceanFreightUsd * usdRate)}</span>
            </div>

            {/* Shipping stage: Port handling */}
            <div className="p-2.5 flex items-center justify-between bg-amber-500/5">
              <span className="text-amber-200 flex items-center gap-1.5">
                <Navigation className="w-3 h-3 text-amber-400" />
                <span>5. Rozładunek w porcie i opłaty terminalowe [AI Dostawa]</span>
              </span>
              <span className="font-semibold text-amber-300">{formatPln(calc.portHandlingEur * 4.28)}</span>
            </div>

            <div className="p-2.5 flex items-center justify-between bg-slate-850/60">
              <span className="text-slate-300">6. Cło celne UE (10% od wartości CIF)</span>
              <span className="font-semibold text-slate-200">{formatPln(calc.customsDutyPln)}</span>
            </div>

            <div className="p-2.5 flex items-center justify-between bg-slate-850/60">
              <span className="text-slate-300">
                7. Akcyza w Polsce ({car.fuelType === 'Elektryczny' ? '0% EV' : calc.exciseTaxRate === 0.031 ? '3.1% (silnik ≤ 2.0L)' : '18.6% (silnik > 2.0L)'})
              </span>
              <span className="font-semibold text-slate-200">{formatPln(calc.exciseTaxPln)}</span>
            </div>

            <div className="p-2.5 flex items-center justify-between bg-slate-850/60">
              <span className="text-slate-300">8. Podatek VAT (odprawa tranzytowa {calc.vatRate * 100}%)</span>
              <span className="font-semibold text-slate-200">{formatPln(calc.vatPln)}</span>
            </div>

            {/* Shipping stage: Poland transport */}
            <div className="p-2.5 flex items-center justify-between bg-emerald-500/5">
              <span className="text-emerald-200 flex items-center gap-1.5">
                <Truck className="w-3 h-3 text-emerald-400" />
                <span>9. Transport lawetą pod dom do {destinationCity} [AI Dostawa]</span>
              </span>
              <span className="font-semibold text-emerald-300">{formatPln(calc.transportToPolandPln)}</span>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-300">10. Agencja celna, tłumaczenia, rzeczoznawca</span>
              <span className="font-semibold text-white">{formatPln(calc.documentsAndAgencyPln)}</span>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-300">11. Adaptacja EU (światła, radio, badanie techniczne)</span>
              <span className="font-semibold text-white">{formatPln(calc.adaptationPln)}</span>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-300">12. Szacowany koszt naprawy blacharsko-lakierniczej</span>
              <span className="font-semibold text-white">{formatPln(calc.estimatedRepairPln)}</span>
            </div>

          </div>
        </div>

        {/* Final Profit Verdict with Shipping factored in */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Całkowity koszt auta "pod klucz" w Polsce (z dostawą):</span>
            <span className="text-sm font-bold text-white tabular-nums">{formatPln(calc.totalLandedCostPln)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Średnia cena rynkowa takiego auta w Polsce (Otomoto):</span>
            <span className="text-sm font-bold text-white tabular-nums">{formatPln(car.polishMarketValuePln)}</span>
          </div>
          <div className="pt-2 border-t border-emerald-500/30 flex items-center justify-between">
            <div>
              <span className="font-bold text-sm text-emerald-300 block">CZYSTY ZYSK PO WSZYSTKICH KOSZTACH:</span>
              <span className="text-[10px] text-slate-400">Uwzględniono pełną dostawę pod dom ({formatPln(calc.totalShippingPln)})</span>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-emerald-400 tabular-nums">
                +{formatPln(calc.estimatedProfitPln)}
              </span>
              <span className="text-xs text-emerald-300 font-semibold block">
                Zwrot z inwestycji (ROI): +{calc.roiPercentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <a
            href={getDirectAuctionUrl(car)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold"
          >
            <span>Bezpośrednia aukcja {car.auctionPlatform} #{car.lotNumber}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-colors active:scale-95"
          >
            Zamknij
          </button>
        </div>

      </div>
    </div>
  );
};
