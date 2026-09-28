import React from 'react';
import { X, FileSpreadsheet, ExternalLink, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { CarAuction } from '../types';

interface SheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSync: () => void;
  carsToSync: CarAuction[];
  isSyncing: boolean;
  syncResultUrl: string | null;
  spreadsheetTitle?: string;
}

export const SheetsSyncModal: React.FC<SheetsSyncModalProps> = ({
  isOpen,
  onClose,
  onConfirmSync,
  carsToSync,
  isSyncing,
  syncResultUrl
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div 
        id="sheets-sync-confirm-modal"
        className="bg-slate-900 border border-slate-750 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-white animate-fadeIn"
      >
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Synchronizacja z Google Sheets
              </h2>
              <p className="text-xs text-slate-400">
                Eksport ofert aut z USA do Twojego prywatnego Dysku Google
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Success State */}
        {syncResultUrl ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-xs space-y-2 text-emerald-200">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Pomyślnie zsynchronizowano z Google Sheets!</span>
              </div>
              <p>
                Dane o <strong>{carsToSync.length}</strong> ofertach (ceny licytacji, koszty transportu, cło, akcyza, szacowany zysk i bezpośrednie linki do Copart/IAAI) zostały zapisane w Twoim arkuszu.
              </p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <a
                href={syncResultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
              >
                <span>Otwórz Arkusz w Google Sheets</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg font-semibold"
              >
                Gotowe
              </button>
            </div>
          </div>
        ) : (
          /* Confirmation State (Mandatory Workspace Guidelines) */
          <div className="space-y-4">
            
            <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-750 text-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-200 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Potwierdzenie operacji zapisu</span>
              </div>
              <p className="text-slate-300">
                Aplikacja utworzy lub zaktualizuje arkusz kalkulacyjny Google Sheets o nazwie:
                <strong className="text-white block mt-1">
                  "AutoUSA AI - Najlepsze Oferty Aut z USA"
                </strong>
              </p>
              <p className="text-slate-400 text-[11px]">
                Zostaną wyeksportowane {carsToSync.length} wybrane pojazdy wraz z wyliczonymi kosztami celnymi, akcyzą dla Polski i numerem telefonu powiadomień (+48 530 741 644).
              </p>
            </div>

            {/* List preview */}
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {carsToSync.map((c) => (
                <div key={c.id} className="p-2 rounded bg-slate-800/80 border border-slate-750 flex items-center justify-between">
                  <span className="font-medium text-slate-200">{c.year} {c.make} {c.model}</span>
                  <span className="text-amber-400 font-bold">${c.estimatedHammerUsd.toLocaleString()} USD</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={onClose}
                disabled={isSyncing}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Anuluj
              </button>

              <button
                id="confirm-sheets-sync-btn"
                onClick={onConfirmSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Zapisywanie w Sheets...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Potwierdź i zapisz w Google Sheets</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
