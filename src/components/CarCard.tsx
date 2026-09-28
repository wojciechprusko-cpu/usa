import React from 'react';
import { 
  ExternalLink, 
  Calculator, 
  FileSpreadsheet, 
  Sparkles, 
  Clock, 
  MapPin, 
  Gauge, 
  ShieldAlert, 
  Car, 
  Search,
  CheckCircle2,
  Truck
} from 'lucide-react';
import { CarAuction } from '../types';
import { calculateImportCosts, formatPln, formatUsd } from '../utils/calculator';
import { getDirectAuctionUrl, getBidFaxHistoryUrl } from '../utils/auctionLinks';

interface CarCardProps {
  car: CarAuction;
  onOpenCalculator: (car: CarAuction) => void;
  onExportToSheets: (car: CarAuction) => void;
  onSendNotification?: (car: CarAuction) => void;
  isSheetsSyncing?: boolean;
}

export const CarCard: React.FC<CarCardProps> = ({
  car,
  onOpenCalculator,
  onExportToSheets,
  isSheetsSyncing = false
}) => {
  const calc = calculateImportCosts(car);

  // Time remaining calculation with real-time seconds precision
  const endMs = new Date(car.auctionEndTime).getTime() - Date.now();
  const totalSecondsLeft = Math.max(0, Math.floor(endMs / 1000));
  const minutesLeft = Math.floor(totalSecondsLeft / 60);
  const hoursLeft = Math.floor(minutesLeft / 60);
  const remMinutes = minutesLeft % 60;
  const remSeconds = totalSecondsLeft % 60;

  let timeString = '';
  if (totalSecondsLeft <= 0) {
    timeString = 'Zakończona';
  } else if (hoursLeft > 0) {
    timeString = `${hoursLeft}h ${remMinutes}m`;
  } else if (minutesLeft > 5) {
    timeString = `${minutesLeft}m`;
  } else {
    timeString = `${minutesLeft}m ${remSeconds}s`;
  }

  const isEndingSoon = totalSecondsLeft > 0 && totalSecondsLeft <= 300; // less than 5 mins

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-slate-700 overflow-hidden shadow-lg transition-all flex flex-col group">
      
      {/* Top Image Section */}
      <div className="relative aspect-[16/10] bg-slate-950 overflow-hidden">
        <img
          src={car.images[0]}
          alt={`${car.year} ${car.make} ${car.model}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

        {/* Platform & Lot */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wider uppercase shadow-md ${
            car.auctionPlatform === 'Copart' 
              ? 'bg-blue-600 text-white' 
              : car.auctionPlatform === 'IAAI'
              ? 'bg-red-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}>
            {car.auctionPlatform}
          </span>
          <span className="px-2 py-1 rounded-lg text-[11px] font-mono font-semibold bg-slate-950/80 text-slate-200 border border-slate-700/80 backdrop-blur-sm">
            #{car.lotNumber}
          </span>
        </div>

        {/* AI Deal Score */}
        <div className="absolute top-2.5 right-2.5">
          <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold text-xs shadow-lg backdrop-blur-md border ${
            car.aiDealScore >= 93
              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
              : car.aiDealScore >= 85
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
              : 'bg-slate-900/90 text-slate-200 border-slate-700'
          }`}>
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>AI: {car.aiDealScore}/100</span>
          </div>
        </div>

        {/* Time Remaining Bar */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs text-white">
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg backdrop-blur-md border font-semibold ${
            isEndingSoon
              ? 'bg-rose-950/90 text-rose-300 border-rose-500/80 animate-pulse'
              : 'bg-slate-950/85 text-amber-300 border-slate-700/80'
          }`}>
            <Clock className={`w-3.5 h-3.5 ${isEndingSoon ? 'text-rose-400' : 'text-amber-400'}`} />
            <span>{isEndingSoon ? 'Koniec za: ' : ''}{timeString}</span>
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-slate-300 font-medium">
            <MapPin className="w-3 h-3 text-slate-400" />
            {car.locationState}
          </span>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
        
        {/* Title & Headline Specs */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug group-hover:text-amber-400 transition-colors">
              {car.year} {car.make} {car.model}
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
              car.titleType === 'Clean Title' 
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' 
                : 'bg-amber-950/80 text-amber-400 border border-amber-500/30'
            }`}>
              {car.titleType}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-300 font-medium">{car.trim}</span>
            <span>·</span>
            <span>{car.engineCapacityCc > 0 ? `${(car.engineCapacityCc / 1000).toFixed(1)}L` : 'EV'}</span>
            <span>·</span>
            <span>Akcyza {calc.exciseTaxRate === 0 ? '0%' : `${(calc.exciseTaxRate * 100).toFixed(1)}%`}</span>
          </div>
        </div>

        {/* Condition & Damage Strip (Clear, Single Surface) */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-850/90 p-2.5 rounded-xl border border-slate-800">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Silnik / Napęd</span>
            <span className={`font-bold flex items-center gap-1 mt-0.5 ${
              car.driveCondition === 'Run & Drive' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${car.driveCondition === 'Run & Drive' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              {car.driveCondition}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Uszkodzenie</span>
            <span className="font-semibold text-slate-200 truncate mt-0.5" title={car.primaryDamage}>
              {car.primaryDamage}
              {car.airbagsDeployed === false && ' (Airbag OK)'}
            </span>
          </div>
        </div>

        {/* Financial Highlights Box */}
        <div className="bg-gradient-to-br from-slate-850 to-slate-900 p-3 rounded-xl border border-slate-750 space-y-2">
          
          {/* Main Profit Callout */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Szacowany Zysk w PL:</span>
            <div className="text-right">
              <span className="text-base sm:text-lg font-black text-emerald-400 tracking-tight tabular-nums block">
                +{formatPln(calc.estimatedProfitPln)}
              </span>
              <span className="text-[10px] text-emerald-500 font-bold">
                ROI: +{calc.roiPercentage}%
              </span>
            </div>
          </div>

          <div className="h-px bg-slate-800 w-full"></div>

          {/* Sub Prices: USA Bid & Total PL */}
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div>
              <span className="text-[10px] text-slate-400 block">Licytacja USA:</span>
              <strong className="text-white font-mono text-xs tabular-nums">{formatUsd(car.estimatedHammerUsd)}</strong>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Koszt pod dom w PL:</span>
              <strong className="text-slate-200 font-mono text-xs tabular-nums">{formatPln(calc.totalLandedCostPln)}</strong>
            </div>
          </div>

          {/* Delivery / Shipping cost indicator */}
          <div className="flex items-center justify-between text-[11px] bg-slate-900/70 px-2.5 py-1.5 rounded-lg border border-slate-750">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Dostawa pod dom:</span>
            </span>
            <span className="font-mono font-bold text-amber-300 text-xs tabular-nums">
              {formatPln(calc.totalShippingPln)}
            </span>
          </div>

        </div>

        {/* AI Insight Snippet */}
        <div className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 leading-relaxed">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-0.5 text-[11px]">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>AI Rekomendacja:</span>
          </div>
          <p className="line-clamp-2 text-[11px] sm:text-xs text-amber-100/90">{car.aiRecommendation}</p>
        </div>

        {/* Action Buttons Section */}
        <div className="space-y-2 pt-1">
          
          {/* VIN & BidFax link */}
          <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
            <span className="font-mono text-[10px] truncate max-w-[170px]" title={car.vin}>
              VIN: {car.vin}
            </span>
            <a
              href={getBidFaxHistoryUrl(car.vin)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold hover:underline shrink-0"
              title="Historia licytacji w BidFax po numerze VIN"
            >
              <Search className="w-3 h-3" />
              <span>BidFax</span>
            </a>
          </div>

          {/* Primary Action: Direct Auction Lot Button (Thumb-Friendly, Min 44px) */}
          <a
            id={`auction-link-${car.id}`}
            href={getDirectAuctionUrl(car)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/15"
            title={`Przejdź bezpośrednio do licytacji ${car.auctionPlatform} #{car.lotNumber}`}
          >
            <span>Licytuj na {car.auctionPlatform} #{car.lotNumber}</span>
            <ExternalLink className="w-4 h-4 shrink-0 stroke-[2.5]" />
          </a>

          {/* Secondary Actions: Calculator & Sheets */}
          <div className="grid grid-cols-2 gap-2">
            <button
              id={`calc-btn-${car.id}`}
              onClick={() => onOpenCalculator(car)}
              className="min-h-[40px] py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:scale-[0.98] border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              title="Kalkulator celno-skarbowy z kosztami transportu"
            >
              <Calculator className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Kalkulator PL</span>
            </button>

            <button
              id={`sheets-btn-${car.id}`}
              onClick={() => onExportToSheets(car)}
              disabled={isSheetsSyncing}
              className="min-h-[40px] py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-emerald-950/50 active:scale-[0.98] border border-slate-700 hover:border-emerald-500/50 text-slate-200 hover:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              title="Zapisz ten samochód do Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Zapisz Sheets</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
