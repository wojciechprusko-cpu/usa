import React, { useState } from 'react';
import { Search, Sparkles, SlidersHorizontal, RefreshCw, X, ChevronDown, Check, Zap, RotateCcw, Bike, Car } from 'lucide-react';
import { FilterState } from '../types';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onOpenAiSearch: () => void;
  onRefreshFeed: () => void;
  isScanning: boolean;
  totalResults: number;
}

const BRANDS = [
  'Wszystkie',
  'Harley-Davidson',
  'BMW',
  'Ducati',
  'Indian',
  'Yamaha',
  'Honda',
  'Kawasaki',
  'Suzuki',
  'Ford',
  'Dodge',
  'Chevrolet',
  'Porsche',
  'Mercedes-Benz',
  'Audi',
  'Tesla',
  'Jeep',
  'Lexus',
  'Ram'
];
const PLATFORMS = ['Wszystkie portale', 'Copart', 'IAAI', 'Bring a Trailer'];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onOpenAiSearch,
  onRefreshFeed,
  isScanning,
  totalResults
}) => {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Count active non-default filters
  const activeFiltersCount = [
    Boolean(filters.make),
    filters.vehicleType !== 'all',
    filters.platform !== 'Wszystkie portale',
    filters.onlyRunAndDrive,
    filters.maxExciseOnly,
    filters.sortBy !== 'score'
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    onFilterChange({
      ...filters,
      searchQuery: '',
      vehicleType: 'all',
      make: '',
      platform: 'Wszystkie portale',
      minYear: 2018,
      maxYear: 2024,
      maxBidUsd: 50000,
      minDealScore: 70,
      onlyRunAndDrive: false,
      maxExciseOnly: false,
      sortBy: 'score'
    });
  };

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 p-2.5 sm:p-4 md:sticky md:top-[60px] z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto space-y-2 sm:space-y-3">
        
        {/* Top search & quick action row */}
        <div className="flex items-center gap-2">
          
          {/* Text search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="filter-search-input"
              type="text"
              placeholder="Szukaj auta, motocykla, modelu, VIN lub numeru lot..."
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
              className="w-full pl-9 pr-8 py-2 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            {filters.searchQuery && (
              <button
                onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full"
                title="Wyczyść wyszukiwanie"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mobile Filter Toggle Button */}
          <button
            id="mobile-filter-toggle-btn"
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all md:hidden shrink-0 active:scale-95 ${
              isMobileFiltersOpen || activeFiltersCount > 0
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-750'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtry</span>
            {activeFiltersCount > 0 && (
              <span className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${
                isMobileFiltersOpen ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
              }`}>
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* AI Search Prompt Button (Desktop) */}
          <button
            id="filter-ai-search-btn"
            onClick={onOpenAiSearch}
            className="hidden sm:flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all shrink-0 active:scale-95"
            title="Wyszukaj z asystentem AI wpisując naturalne zapytanie"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Asystent</span>
          </button>

          {/* Refresh Scanner */}
          <button
            id="filter-refresh-btn"
            onClick={onRefreshFeed}
            disabled={isScanning}
            className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 hover:text-white transition-colors disabled:opacity-50 shrink-0 active:scale-95"
            title="Przeskanuj bazy Copart i IAAI i wyselekcjonuj 50 najlepszych okazji"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{isScanning ? 'Skanowanie 50...' : 'Skanuj 50 Okazji'}</span>
          </button>

        </div>

        {/* Vehicle Category Selector Bar (All, Cars, Motorcycles) */}
        <div className="flex items-center gap-2 pt-0.5">
          <div className="flex items-center p-1 bg-slate-800/90 rounded-xl border border-slate-700/80 gap-1 text-xs">
            <button
              onClick={() => onFilterChange({ ...filters, vehicleType: 'all' })}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all active:scale-95 ${
                filters.vehicleType === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-750'
              }`}
            >
              <span>Wszystkie pojazdy</span>
            </button>

            <button
              onClick={() => onFilterChange({ ...filters, vehicleType: 'car' })}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all active:scale-95 ${
                filters.vehicleType === 'car'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-750'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Samochody</span>
            </button>

            <button
              onClick={() => onFilterChange({ ...filters, vehicleType: 'motorcycle' })}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all active:scale-95 ${
                filters.vehicleType === 'motorcycle'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Motocykle</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider ${
                filters.vehicleType === 'motorcycle'
                  ? 'bg-slate-950 text-emerald-300'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                0% Akcyzy
              </span>
            </button>
          </div>
        </div>

        {/* Brand horizontal scroll carousel (Mobile & Desktop) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 scroll-smooth">
          {BRANDS.map((brand) => {
            const isActive = (brand === 'Wszystkie' && !filters.make) || filters.make === brand;
            return (
              <button
                key={brand}
                onClick={() => onFilterChange({ ...filters, make: brand === 'Wszystkie' ? '' : brand })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 active:scale-95 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700/60'
                }`}
              >
                {brand}
              </button>
            );
          })}
        </div>

        {/* Advanced Filters: Always visible on Desktop, collapsible on Mobile */}
        <div className={`${isMobileFiltersOpen ? 'block' : 'hidden md:flex'} pt-2 border-t border-slate-800/80 flex-wrap items-center justify-between gap-2.5`}>
          
          {/* Left: Quick Toggles (Run&Drive, Excise, Platform) */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            
            {/* Platform Selector */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 text-[11px] hidden sm:inline">Portal:</span>
              <select
                id="filter-platform-select"
                value={filters.platform}
                onChange={(e) => onFilterChange({ ...filters, platform: e.target.value })}
                className="bg-slate-800 text-slate-200 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Run & Drive only toggle */}
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, onlyRunAndDrive: !filters.onlyRunAndDrive })}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all active:scale-95 ${
                filters.onlyRunAndDrive
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                filters.onlyRunAndDrive ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-600'
              }`}>
                {filters.onlyRunAndDrive && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
              <span>Tylko Run & Drive</span>
            </button>

            {/* Low Excise toggle */}
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, maxExciseOnly: !filters.maxExciseOnly })}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all active:scale-95 ${
                filters.maxExciseOnly
                  ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                filters.maxExciseOnly ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'border-slate-600'
              }`}>
                {filters.maxExciseOnly && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
              <span>Niska akcyza (&le;2.0L / EV)</span>
            </button>

          </div>

          {/* Right: Sorting & Results Count */}
          <div className="flex items-center justify-between md:justify-end gap-2.5 w-full md:w-auto pt-1 md:pt-0">
            
            {/* Sorting */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="filter-sort-select"
                value={filters.sortBy}
                onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value as any })}
                className="bg-slate-800 text-slate-200 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
              >
                <option value="score">Ocena AI (Najwyższa)</option>
                <option value="profit">Maksymalny Zysk w PL</option>
                <option value="endingSoon">Koniec aukcji (Najbliższy)</option>
                <option value="priceAsc">Cena licytacji (Najniższa)</option>
              </select>
            </div>

            {/* Results Count & Reset */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">
                Ofert: <strong className="text-white tabular-nums">{totalResults}</strong>
              </span>

              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold text-[11px]"
                  title="Zresetuj filtry"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
