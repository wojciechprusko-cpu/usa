import React from 'react';
import { Sparkles, Trash2, RefreshCw, Pause, Play, Activity, Clock, ShieldCheck } from 'lucide-react';

interface AiLiveRadarBarProps {
  secondsLeft: number;
  totalCycleSeconds: number;
  isAutoLoopActive: boolean;
  onToggleAutoLoop: () => void;
  onForceRefresh: () => void;
  activeCount: number;
  removedCount: number;
  onOpenRemovedModal: () => void;
  lastAiAction: string;
  isUpdating: boolean;
}

export const AiLiveRadarBar: React.FC<AiLiveRadarBarProps> = ({
  secondsLeft,
  totalCycleSeconds,
  isAutoLoopActive,
  onToggleAutoLoop,
  onForceRefresh,
  activeCount,
  removedCount,
  onOpenRemovedModal,
  lastAiAction,
  isUpdating
}) => {
  // Calculate percentage of 5-second countdown for progress bar
  const progressPercent = Math.max(0, Math.min(100, ((totalCycleSeconds - secondsLeft) / totalCycleSeconds) * 100));

  return (
    <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl shadow-lg p-2.5 sm:p-4 text-white">
      {/* Mobile Compact Layout */}
      <div className="flex items-center justify-between gap-2 sm:hidden">
        {/* Left: Indicator & Counts */}
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            {isAutoLoopActive && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isAutoLoopActive ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
          </span>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-amber-400">AI Radar</span>
            <span className="text-slate-400">·</span>
            <span className="text-emerald-400 font-bold tabular-nums">{activeCount} aut</span>
            {removedCount > 0 && (
              <>
                <span className="text-slate-400">·</span>
                <button
                  onClick={onOpenRemovedModal}
                  className="text-red-400 hover:text-red-300 font-medium text-[11px] underline"
                >
                  -{removedCount} nieakt.
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right: Controls & Countdown */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-amber-300 font-bold text-xs bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {isUpdating ? '...' : `${secondsLeft}s`}
          </span>
          <button
            onClick={onToggleAutoLoop}
            className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
            title={isAutoLoopActive ? 'Pauza' : 'Start'}
          >
            {isAutoLoopActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onForceRefresh}
            disabled={isUpdating}
            className="p-1 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            title="Odśwież teraz"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Desktop Full Layout */}
      <div className="hidden sm:flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Left: Engine Identity & Pulse */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`p-2.5 rounded-xl border flex items-center justify-center ${
              isAutoLoopActive
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-lg shadow-amber-500/10'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              <Activity className={`w-5 h-5 ${isAutoLoopActive ? 'animate-pulse text-amber-400' : ''}`} />
            </div>
            {isAutoLoopActive && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Live Engine • Aktualizacja co 5 sekund</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isAutoLoopActive 
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {isAutoLoopActive ? 'AKTYWNY CYKL (5s)' : 'WSTRZYMANE'}
              </span>
            </div>

            <div className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
              <span className="font-semibold text-white">Ostatnia operacja AI:</span>
              <span className="text-amber-200/90 truncate max-w-xs sm:max-w-md">
                {lastAiAction || 'Monitorowanie aukcji Copart i IAAI w czasie rzeczywistym...'}
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right: Stats & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
          
          {/* Real-time stats */}
          <div className="flex items-center gap-2 text-xs">
            
            {/* Active offers badge */}
            <div className="bg-slate-800/90 border border-slate-700/80 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Aktywne:</span>
              <strong className="text-emerald-400 font-bold">{activeCount}</strong>
            </div>

            {/* Removed offers badge (clickable) */}
            <button
              id="view-removed-auctions-btn"
              onClick={onOpenRemovedModal}
              className="bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 hover:border-red-500/50 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors group"
              title="Zobacz listę ofert usuniętych jako nieaktualne lub zakończone"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
              <span className="text-slate-400 text-[11px]">Usunięte nieaktualne:</span>
              <strong className="text-red-400 font-bold bg-red-950/80 px-1.5 py-0.2 rounded border border-red-800/60">
                {removedCount}
              </strong>
            </button>

          </div>

          {/* Countdown timer pill & action controls */}
          <div className="flex items-center gap-2">
            
            {/* Timer countdown pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400 text-[11px]">Kolejna AI:</span>
              <strong className="font-mono text-amber-300 font-bold w-6 text-center">
                {isUpdating ? 'SYNC' : `${secondsLeft}s`}
              </strong>
            </div>

            {/* Pause/Resume button */}
            <button
              id="toggle-live-loop-btn"
              onClick={onToggleAutoLoop}
              className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center transition-colors ${
                isAutoLoopActive
                  ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700 hover:text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
              }`}
              title={isAutoLoopActive ? 'Wstrzymaj automatyczny cykl co 5s' : 'Wznów automatyczny cykl co 5s'}
            >
              {isAutoLoopActive ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>

            {/* Force Refresh Button */}
            <button
              id="force-ai-refresh-btn"
              onClick={onForceRefresh}
              disabled={isUpdating}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              title="Wymuś natychmiastowe odświeżenie i usunięcie nieaktualnych"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Odśwież teraz</span>
            </button>

          </div>

        </div>

      </div>

      {/* 5-Second Real-Time Countdown Line */}
      <div className="mt-2 sm:mt-3 w-full bg-slate-950 rounded-full h-1 overflow-hidden border border-slate-800">
        <div 
          className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 transition-all duration-300 ease-linear rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
