import React from 'react';
import { Trash2, X, AlertTriangle, CheckCircle2, ExternalLink, Clock, DollarSign } from 'lucide-react';
import { RemovedAuctionLog } from '../types';
import { formatUsd } from '../utils/calculator';

interface RemovedAuctionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  removedLogs: RemovedAuctionLog[];
  onClearLogs: () => void;
}

export const RemovedAuctionsModal: React.FC<RemovedAuctionsModalProps> = ({
  isOpen,
  onClose,
  removedLogs,
  onClearLogs
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Dziennik Usuniętych Ofert AI</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800 font-mono">
                  {removedLogs.length} usuniętych
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Aukcje, które wygasły, zostały sprzedane lub wycofane przez dom aukcyjny (usunięte automatycznie w cyklu co 5s).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {removedLogs.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-white">Brak usuniętych ofert</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Silnik AI monitoruje oferty co 5 sekund. Gdy tylko aukcja minie swój czas lub zostanie sfinalizowana, natychmiast trafi tutaj i zniknie z głównej listy.
              </p>
            </div>
          ) : (
            removedLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-850 rounded-xl border border-slate-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{log.carTitle}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {log.auctionPlatform} #{log.lotNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                    <span className="font-mono text-slate-400">VIN: {log.vin}</span>
                    <span>•</span>
                    <span className="text-amber-300 font-medium">Ostatnia cena: {formatUsd(log.finalBidUsd)}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-1 text-right">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    log.reason.includes('Czas')
                      ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                      : log.reason.includes('Sprzedane')
                      ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800'
                  }`}>
                    {log.reason}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {log.removedAt}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClearLogs}
            disabled={removedLogs.length === 0}
            className="text-xs text-slate-400 hover:text-red-400 transition-colors disabled:opacity-40"
          >
            Wyczyść historię usuniętych
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
          >
            Zamknij
          </button>
        </div>

      </div>
    </div>
  );
};
