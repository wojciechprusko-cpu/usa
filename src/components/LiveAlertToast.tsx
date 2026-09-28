import React from 'react';
import { Bell, ExternalLink, X, ArrowUpRight } from 'lucide-react';
import { CarAuction } from '../types';
import { getDirectAuctionUrl } from '../utils/auctionLinks';

interface LiveAlertToastProps {
  deal: CarAuction | null;
  targetPhone?: string;
  onClose: () => void;
  onOpenDetails: (deal: CarAuction) => void;
  onTriggerSms?: (deal: CarAuction) => void;
}

export const LiveAlertToast: React.FC<LiveAlertToastProps> = ({
  deal,
  onClose,
  onOpenDetails
}) => {
  if (!deal) return null;

  const liveUrl = getDirectAuctionUrl(deal);

  return (
    <div className="fixed bottom-20 md:bottom-5 right-3 md:right-5 z-50 max-w-[calc(100vw-24px)] sm:max-w-sm w-full bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl p-3.5 sm:p-4 text-white animate-bounce-short">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black">
            <Bell className="w-4 h-4 animate-swing" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              Nowa Okazja AI • Powiadomienie na żywo
            </span>
            <h4 className="text-xs font-bold text-white leading-tight">
              {deal.year} {deal.make} {deal.model}
            </h4>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-2.5 p-2 bg-slate-850 rounded-xl border border-slate-750 text-[11px] space-y-1">
        <div className="flex justify-between text-slate-300">
          <span>AI Deal Score:</span>
          <span className="text-emerald-400 font-bold">{deal.aiDealScore}/100</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Platforma / Lot:</span>
          <span className="font-mono text-amber-300 font-semibold">{deal.auctionPlatform} #{deal.lotNumber}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Aktualna oferta:</span>
          <span className="text-white font-bold">${deal.currentBidUsd.toLocaleString()} USD</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow"
          title={`Bezpośredni link do licytacji ${deal.auctionPlatform}`}
        >
          <span>Aukcja {deal.auctionPlatform}</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={() => onOpenDetails(deal)}
          className="py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
        >
          Kalkulator
        </button>
      </div>
    </div>
  );
};
