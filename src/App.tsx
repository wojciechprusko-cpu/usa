import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  Sparkles, 
  Radio, 
  Car, 
  Bell, 
  FileSpreadsheet, 
  Download, 
  TrendingUp, 
  ShieldCheck, 
  SlidersHorizontal,
  ExternalLink,
  Flame,
  Clock,
  ArrowUpDown,
  CheckCircle2,
  Send,
  X
} from 'lucide-react';
import { CarAuction, FilterState, NotificationLog, RemovedAuctionLog } from './types';
import { INITIAL_AUCTIONS, FRESH_AUCTION_POOL } from './data/mockAuctions';
import { calculateImportCosts, formatPln } from './utils/calculator';
import { getDirectAuctionUrl } from './utils/auctionLinks';
import { initAuth, googleSignIn, logout } from './services/firebaseAuth';
import { createOrUpdateCarSheet } from './services/googleSheets';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { CarCard } from './components/CarCard';
import { ImportCalculatorModal } from './components/ImportCalculatorModal';
import { NotificationModal } from './components/NotificationModal';
import { AiSearchModal } from './components/AiSearchModal';
import { SheetsSyncModal } from './components/SheetsSyncModal';
import { LiveAlertToast } from './components/LiveAlertToast';
import { AiLiveRadarBar } from './components/AiLiveRadarBar';
import { RemovedAuctionsModal } from './components/RemovedAuctionsModal';

export default function App() {
  // State: Inventory & Scanner
  const [auctions, setAuctions] = useState<CarAuction[]>(INITIAL_AUCTIONS);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedTime, setLastScannedTime] = useState<string>(new Date().toLocaleTimeString('pl-PL'));

  // State: AI 5-second continuous update loop & outdated auction removal
  const [secondsToNextTick, setSecondsToNextTick] = useState(5);
  const [isAutoLoopActive, setIsAutoLoopActive] = useState(true);
  const [isAiUpdating, setIsAiUpdating] = useState(false);
  const [lastAiAction, setLastAiAction] = useState('Silnik AI aktywny • Monitorowanie aukcji Copart i IAAI co 5s');
  const [isRemovedModalOpen, setIsRemovedModalOpen] = useState(false);
  const [removedLogs, setRemovedLogs] = useState<RemovedAuctionLog[]>([
    {
      id: 'rem-demo-1',
      carTitle: '2019 BMW M4 Competition Coupe',
      lotNumber: '76812049',
      vin: 'WBS4Y9C50KFK19284',
      auctionPlatform: 'Copart',
      reason: 'Sprzedane na aukcji (Kup Teraz)',
      removedAt: new Date(Date.now() - 12 * 60 * 1000).toLocaleTimeString('pl-PL'),
      finalBidUsd: 28400
    },
    {
      id: 'rem-demo-2',
      carTitle: '2021 Dodge Durango R/T AWD',
      lotNumber: '34910284',
      vin: '1C4SDJCT4MC192847',
      auctionPlatform: 'IAAI',
      reason: 'Czas licytacji minął',
      removedAt: new Date(Date.now() - 28 * 60 * 1000).toLocaleTimeString('pl-PL'),
      finalBidUsd: 16900
    }
  ]);
  
  // State: User's Phone & Notifications (+48 530 741 644)
  const [targetPhone, setTargetPhone] = useState<string>('+48 530 741 644');
  const [autoAlertEnabled, setAutoAlertEnabled] = useState(true);
  const [minScoreThreshold, setMinScoreThreshold] = useState(88);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [liveToastDeal, setLiveToastDeal] = useState<CarAuction | null>(null);
  const [sentFeedback, setSentFeedback] = useState<{
    title: string;
    message: string;
    delivered: boolean;
    provider?: string;
    smsDirectUri?: string;
    whatsappUri?: string;
  } | null>(null);

  // State: Google Workspace (Sheets & Drive)
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [activeSpreadsheetId, setActiveSpreadsheetId] = useState<string | null>(null);

  // State: Modals
  const [selectedCalcCar, setSelectedCalcCar] = useState<CarAuction | null>(null);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isAiSearchOpen, setIsAiSearchOpen] = useState(false);

  // State: Sheets Sync Modal
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [carsToSync, setCarsToSync] = useState<CarAuction[]>([]);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetsSyncResultUrl, setSheetsSyncResultUrl] = useState<string | null>(null);

  // State: Filters
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
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

  // 1. Initialize Firebase Google Auth on App Load (as required by workspace skill)
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Fetch server-side notification history
  useEffect(() => {
    fetch('/api/notifications/history')
      .then((res) => res.json())
      .then((data) => {
        if (data?.logs) setNotificationLogs(data.logs);
      })
      .catch((err) => console.warn('Notification history fetch warning:', err));
  }, []);

  // Handler: Google Sign In
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setUser(null);
    setNeedsAuth(true);
    setSpreadsheetUrl(null);
  };

  // Handler: Send Notification to +48 530 741 644
  const handleSendNotification = useCallback(async (car: CarAuction) => {
    const calc = calculateImportCosts(car);
    try {
      const res = await fetch('/api/notify-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carTitle: `${car.year} ${car.make} ${car.model} ${car.trim}`,
          vin: car.vin,
          lotNumber: car.lotNumber,
          auctionPlatform: car.auctionPlatform,
          auctionUrl: car.auctionUrl,
          estimatedProfitPln: calc.estimatedProfitPln,
          dealScore: car.aiDealScore,
          targetPhone,
          channel: 'SMS'
        })
      });

      const data = await res.json();
      if (data.log) {
        setNotificationLogs((prev) => [data.log, ...prev]);
        setAuctions((prev) => prev.map((c) => (c.id === car.id ? { ...c, notificationSent: true } : c)));
        setSentFeedback({
          title: `${car.year} ${car.make} ${car.model}`,
          message: data.message || `Wysłano powiadomienie na numer ${targetPhone}`,
          delivered: !!data.delivered,
          provider: data.provider,
          smsDirectUri: data.smsDirectUri,
          whatsappUri: data.whatsappUri
        });
        setLiveToastDeal(car);

        // Auto dismiss banner after 8 seconds
        setTimeout(() => {
          setSentFeedback((current) => (current?.title === `${car.year} ${car.make} ${car.model}` ? null : current));
        }, 8000);
      }
    } catch (err) {
      console.error('Błąd wysyłania powiadomienia:', err);
    }
  }, [targetPhone]);

  // 3. AI Core Engine: 5-Second Real-Time Update & Automatic Outdated Lot Purge
  const executeAi5sUpdateCycle = useCallback(() => {
    setIsAiUpdating(true);
    const now = Date.now();
    const newlyRemoved: RemovedAuctionLog[] = [];

    setAuctions((currentAuctions) => {
      const surviving: CarAuction[] = [];

      for (const car of currentAuctions) {
        const endMs = new Date(car.auctionEndTime).getTime() - now;

        // Condition A: Auction expired by time (czas minął)
        if (endMs <= 0) {
          newlyRemoved.push({
            id: `rem-${Date.now()}-${car.id}`,
            carTitle: `${car.year} ${car.make} ${car.model}`,
            lotNumber: car.lotNumber,
            vin: car.vin,
            auctionPlatform: car.auctionPlatform,
            reason: 'Czas licytacji minął',
            removedAt: new Date().toLocaleTimeString('pl-PL'),
            finalBidUsd: car.currentBidUsd
          });
          continue; // Usunięta!
        }

        // Condition B: In live bidding, high-velocity lots can be sold or bought out
        if (endMs < 60 * 1000 && Math.random() < 0.22) {
          newlyRemoved.push({
            id: `rem-${Date.now()}-${car.id}`,
            carTitle: `${car.year} ${car.make} ${car.model}`,
            lotNumber: car.lotNumber,
            vin: car.vin,
            auctionPlatform: car.auctionPlatform,
            reason: car.buyNowUsd && Math.random() > 0.4 ? 'Sprzedane na aukcji (Kup Teraz)' : 'Zakończona licytacja',
            removedAt: new Date().toLocaleTimeString('pl-PL'),
            finalBidUsd: car.buyNowUsd || car.estimatedHammerUsd
          });
          continue; // Usunięta!
        }

        // Update active car state
        const carCopy = { ...car };
        if (endMs < 5 * 60 * 1000) {
          carCopy.status = 'ENDING_SOON';
        }

        // Live bids fluctuation (simulate real auction room floor in NJ/TX/GA/CA)
        if (Math.random() < 0.42) {
          const bidStep = (Math.floor(Math.random() * 3) + 1) * 100; // +100$, +200$, +300$
          carCopy.currentBidUsd += bidStep;
          carCopy.lastBidChange = bidStep;
          carCopy.bidCount = (carCopy.bidCount || 5) + 1;
          carCopy.lastUpdatedTimestamp = Date.now();
          if (carCopy.currentBidUsd > carCopy.estimatedHammerUsd * 0.95) {
            carCopy.estimatedHammerUsd = Math.round(carCopy.currentBidUsd * 1.07);
          }
        }

        surviving.push(carCopy);
      }

      // Condition C: Replenish with fresh verified auction deals from FRESH_AUCTION_POOL
      let newDiscoveredCar: CarAuction | null = null;
      if (surviving.length < 10 || Math.random() < 0.35) {
        const poolItem = FRESH_AUCTION_POOL[Math.floor(Math.random() * FRESH_AUCTION_POOL.length)];
        const uniqueLotNumber = `${Math.floor(70000000 + Math.random() * 20000000)}`;
        const randomMins = Math.floor(35 + Math.random() * 160);

        const alreadyIn = surviving.some((c) => c.vin === poolItem.vin);
        if (!alreadyIn) {
          const directUrl = poolItem.auctionUrl || getDirectAuctionUrl(poolItem);
          const freshCar: CarAuction = {
            ...poolItem,
            id: `lot-${poolItem.auctionPlatform.toLowerCase()}-${poolItem.lotNumber || uniqueLotNumber}`,
            lotNumber: poolItem.lotNumber || uniqueLotNumber,
            auctionUrl: directUrl,
            auctionEndTime: new Date(Date.now() + (14 + Math.random() * 38) * 60 * 60 * 1000).toISOString(),
            status: 'ACTIVE',
            bidCount: Math.floor(3 + Math.random() * 8),
            lastUpdatedTimestamp: Date.now()
          };

          surviving.unshift(freshCar);
          newDiscoveredCar = freshCar;
        }
      }

      // Update AI Status Action Log
      if (newlyRemoved.length > 0) {
        setRemovedLogs((prev) => [...newlyRemoved, ...prev].slice(0, 60));
        setLastAiAction(`Usunięto ${newlyRemoved.length} nieaktualną(e) ofertę(y): ${newlyRemoved.map((r) => r.carTitle).join(', ')}`);
      } else if (newDiscoveredCar) {
        setLastAiAction(`Wykryto nową okazję aukcyjną: ${newDiscoveredCar.year} ${newDiscoveredCar.make} ${newDiscoveredCar.model} (Score: ${newDiscoveredCar.aiDealScore}/100)`);
        if (autoAlertEnabled && newDiscoveredCar.aiDealScore >= minScoreThreshold) {
          handleSendNotification(newDiscoveredCar);
        }
      } else {
        setLastAiAction(`Zaktualizowano oferty licytacji w USA • Aktywne oferty: ${surviving.length}`);
      }

      return surviving;
    });

    setLastScannedTime(new Date().toLocaleTimeString('pl-PL'));
    setTimeout(() => setIsAiUpdating(false), 800);
  }, [autoAlertEnabled, minScoreThreshold, handleSendNotification]);

  // 4. Five-Second Countdown Interval Effect
  useEffect(() => {
    if (!isAutoLoopActive) return;

    const timer = setInterval(() => {
      setSecondsToNextTick((prev) => {
        if (prev <= 1) {
          executeAi5sUpdateCycle();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoLoopActive, executeAi5sUpdateCycle]);

  // Handler: Trigger test SMS
  const handleTriggerTestSms = () => {
    if (auctions.length > 0) {
      handleSendNotification(auctions[0]);
    }
  };

  // Handler: Refresh feed manually
  const handleRefreshFeed = () => {
    setIsScanning(true);
    executeAi5sUpdateCycle();
    setSecondsToNextTick(5);
    setTimeout(() => {
      setIsScanning(false);
    }, 600);
  };

  // Handler: Export single car to Google Sheets
  const handleExportSingleToSheets = (car: CarAuction) => {
    if (!user) {
      handleGoogleLogin();
      return;
    }
    setCarsToSync([car]);
    setSheetsSyncResultUrl(null);
    setIsSheetsModalOpen(true);
  };

  // Handler: Export all matching filtered cars to Google Sheets
  const handleExportAllToSheets = () => {
    if (!user) {
      handleGoogleLogin();
      return;
    }
    setCarsToSync(filteredAuctions);
    setSheetsSyncResultUrl(null);
    setIsSheetsModalOpen(true);
  };

  // Handler: Confirm Google Sheets execution (User confirmation required)
  const handleConfirmSheetsSync = async () => {
    setIsSyncingSheets(true);
    try {
      const result = await createOrUpdateCarSheet(carsToSync, activeSpreadsheetId);
      setActiveSpreadsheetId(result.spreadsheetId);
      setSpreadsheetUrl(result.spreadsheetUrl);
      setSheetsSyncResultUrl(result.spreadsheetUrl);
    } catch (error: any) {
      console.error('Sheets sync error:', error);
      alert(`Błąd zapisu do Google Sheets: ${error.message || error}`);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Filtered & Sorted Auctions
  const filteredAuctions = useMemo(() => {
    return auctions
      .filter((car) => {
        // Query match
        if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase();
          const matchTitle = `${car.year} ${car.make} ${car.model} ${car.trim}`.toLowerCase().includes(q);
          const matchVin = car.vin.toLowerCase().includes(q);
          const matchLot = car.lotNumber.toLowerCase().includes(q);
          if (!matchTitle && !matchVin && !matchLot) return false;
        }

        // Make
        if (filters.make && car.make !== filters.make) return false;

        // Platform
        if (filters.platform !== 'Wszystkie portale' && car.auctionPlatform !== filters.platform) return false;

        // Run & Drive
        if (filters.onlyRunAndDrive && car.driveCondition !== 'Run & Drive') return false;

        // Low excise (<= 2000cc or EV)
        if (filters.maxExciseOnly && car.fuelType !== 'Elektryczny' && car.engineCapacityCc > 2000) return false;

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'score') return b.aiDealScore - a.aiDealScore;
        if (filters.sortBy === 'profit') {
          const profitA = calculateImportCosts(a).estimatedProfitPln;
          const profitB = calculateImportCosts(b).estimatedProfitPln;
          return profitB - profitA;
        }
        if (filters.sortBy === 'priceAsc') return a.estimatedHammerUsd - b.estimatedHammerUsd;
        if (filters.sortBy === 'endingSoon') {
          return new Date(a.auctionEndTime).getTime() - new Date(b.auctionEndTime).getTime();
        }
        return 0;
      });
  }, [auctions, filters]);

  // Max profit metric
  const maxProfit = useMemo(() => {
    return Math.max(...auctions.map((c) => calculateImportCosts(c).estimatedProfitPln), 0);
  }, [auctions]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      
      {/* Header bar */}
      <Header
        user={user}
        needsAuth={needsAuth}
        isLoggingIn={isLoggingIn}
        onLogin={handleGoogleLogin}
        onLogout={handleGoogleLogout}
        spreadsheetUrl={spreadsheetUrl}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        notificationCount={notificationLogs.length}
        totalDealsCount={auctions.length}
        maxProfitPln={maxProfit}
        onOpenAiSearch={() => setIsAiSearchOpen(true)}
      />

      {/* Real-time Alert Notification Banner (Desktop & Tablet) */}
      <div className="hidden sm:block bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-b border-amber-500/20 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-medium">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span>Automatyczny dyspozytor alertów podłączony do numeru:</span>
            <strong className="font-mono text-white bg-slate-900 px-2 py-0.5 rounded border border-amber-500/40 text-xs">
              {targetPhone}
            </strong>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>Ostatnie skanowanie: <strong className="text-slate-200">{lastScannedTime}</strong></span>
            <span>•</span>
            <button
              onClick={() => setIsNotificationModalOpen(true)}
              className="text-amber-400 hover:text-amber-300 underline font-semibold"
            >
              Ustawienia alertów ({notificationLogs.length} wysłanych)
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        onOpenAiSearch={() => setIsAiSearchOpen(true)}
        onRefreshFeed={handleRefreshFeed}
        isScanning={isScanning}
        totalResults={filteredAuctions.length}
      />

      {/* Main Content Area - with mobile bottom padding for touch bar */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24 md:pb-8">
        
        {/* Real-time 5-second AI Scanner & Outdated Auction Purge Radar */}
        <AiLiveRadarBar
          secondsLeft={secondsToNextTick}
          totalCycleSeconds={5}
          isAutoLoopActive={isAutoLoopActive}
          onToggleAutoLoop={() => setIsAutoLoopActive((v) => !v)}
          onForceRefresh={() => {
            executeAi5sUpdateCycle();
            setSecondsToNextTick(5);
          }}
          activeCount={filteredAuctions.length}
          removedCount={removedLogs.length}
          onOpenRemovedModal={() => setIsRemovedModalOpen(true)}
          lastAiAction={lastAiAction}
          isUpdating={isAiUpdating}
        />

        {/* Section Header & Bulk Action Bar */}
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 sm:gap-2">
              <Flame className="w-4 h-4 text-orange-400 shrink-0" />
              <span>Okazje z Aukcji w USA</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {filteredAuctions.length} aut
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 hidden sm:block">
              Przeliczone koszty: cło 10%, akcyza, fracht morski i szacowany zysk w Polsce.
            </p>
          </div>

          {/* Bulk Sync Button */}
          <button
            id="bulk-export-sheets-btn"
            onClick={handleExportAllToSheets}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-bold transition-all shadow shrink-0 active:scale-95"
            title="Eksportuj wszystkie przefiltrowane samochody do Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Zsynchronizuj z Google Sheets</span>
            <span className="sm:hidden">Arkusz ({filteredAuctions.length})</span>
          </button>
        </div>

        {/* Cars Grid */}
        {filteredAuctions.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-slate-900/40 rounded-2xl border border-slate-800 p-6 space-y-3">
            <Car className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">Brak ofert spełniających podane kryteria</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Spróbuj wyczyścić filtr wyszukiwania lub kliknij przycisk "Skanuj", aby odświeżyć bazę domów aukcyjnych.
            </p>
            <button
              onClick={() => setFilters({
                searchQuery: '',
                make: '',
                platform: 'Wszystkie portale',
                minYear: 2018,
                maxYear: 2024,
                maxBidUsd: 50000,
                minDealScore: 70,
                onlyRunAndDrive: false,
                maxExciseOnly: false,
                sortBy: 'score'
              })}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-semibold rounded-xl text-white border border-slate-700 active:scale-95"
            >
              Zresetuj wszystkie filtry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredAuctions.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                onOpenCalculator={(selected) => {
                  setSelectedCalcCar(selected);
                  setIsCalcOpen(true);
                }}
                onExportToSheets={handleExportSingleToSheets}
                onSendNotification={handleSendNotification}
              />
            ))}
          </div>
        )}

      </main>

      {/* Fixed Mobile Bottom Tab Bar (Thumb Zone) */}
      <nav 
        aria-label="Nawigacja mobilna"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 shadow-2xl"
      >
        <div className="grid grid-cols-5 items-center h-14">
          
          {/* Tab 1: Okazje (Scroll to top) */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-amber-400 transition-colors active:scale-95"
          >
            <Car className="w-5 h-5 text-amber-400" />
            <span className="text-[10px] font-medium tracking-tight">Okazje</span>
          </button>

          {/* Tab 2: AI Asystent */}
          <button
            onClick={() => setIsAiSearchOpen(true)}
            className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-amber-400 transition-colors active:scale-95"
          >
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-[10px] font-medium tracking-tight">AI Szukaj</span>
          </button>

          {/* Tab 3: Alerty SMS */}
          <button
            onClick={() => setIsNotificationModalOpen(true)}
            className="relative flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-amber-400 transition-colors active:scale-95"
          >
            <div className="relative">
              <Bell className="w-5 h-5 text-amber-400" />
              {notificationLogs.length > 0 && (
                <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                  {notificationLogs.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium tracking-tight">Alerty</span>
          </button>

          {/* Tab 4: Google Sheets */}
          <button
            onClick={handleExportAllToSheets}
            className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors active:scale-95"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span className="text-[10px] font-medium tracking-tight">Arkusz</span>
          </button>

          {/* Tab 5: Kalkulator */}
          <button
            onClick={() => {
              if (filteredAuctions.length > 0) {
                setSelectedCalcCar(filteredAuctions[0]);
              }
              setIsCalcOpen(true);
            }}
            className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-amber-400 transition-colors active:scale-95"
          >
            <SlidersHorizontal className="w-5 h-5 text-slate-300" />
            <span className="text-[10px] font-medium tracking-tight">Kalkulator</span>
          </button>

        </div>
      </nav>

      {/* Footer (Desktop & Tablet) */}
      <footer className="bg-slate-900/80 border-t border-slate-800 py-6 text-xs text-slate-500 mb-16 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">AutoUSA AI</span>
            <span>• System wyszukiwania aut powypadkowych i całych z USA</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Powiadomienia SMS: <strong className="text-amber-400">{targetPhone}</strong></span>
            <span>•</span>
            <span>Odprawa celna: Bremerhaven & Gdynia</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isCalcOpen && selectedCalcCar && (
        <ImportCalculatorModal
          car={selectedCalcCar}
          isOpen={isCalcOpen}
          onClose={() => setIsCalcOpen(false)}
        />
      )}

      {isNotificationModalOpen && (
        <NotificationModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          targetPhone={targetPhone}
          onUpdatePhone={setTargetPhone}
          logs={notificationLogs}
          onTriggerTestSms={handleTriggerTestSms}
          autoAlertEnabled={autoAlertEnabled}
          onToggleAutoAlert={setAutoAlertEnabled}
          minScoreThreshold={minScoreThreshold}
          onChangeScoreThreshold={setMinScoreThreshold}
        />
      )}

      {isAiSearchOpen && (
        <AiSearchModal
          isOpen={isAiSearchOpen}
          onClose={() => setIsAiSearchOpen(false)}
          onApplyQueryFilter={(term) => setFilters((prev) => ({ ...prev, searchQuery: term }))}
        />
      )}

      {isSheetsModalOpen && (
        <SheetsSyncModal
          isOpen={isSheetsModalOpen}
          onClose={() => setIsSheetsModalOpen(false)}
          onConfirmSync={handleConfirmSheetsSync}
          carsToSync={carsToSync}
          isSyncing={isSyncingSheets}
          syncResultUrl={sheetsSyncResultUrl}
        />
      )}

      {/* Removed/Outdated Auctions Modal */}
      {isRemovedModalOpen && (
        <RemovedAuctionsModal
          isOpen={isRemovedModalOpen}
          onClose={() => setIsRemovedModalOpen(false)}
          removedLogs={removedLogs}
          onClearLogs={() => setRemovedLogs([])}
        />
      )}

      {/* Carrier SMS Feedback Toast */}
      {sentFeedback && (
        <div className={`fixed bottom-20 sm:bottom-24 right-3 sm:right-5 z-50 max-w-[calc(100vw-24px)] sm:max-w-sm w-full p-4 rounded-2xl shadow-2xl border ${
          sentFeedback.delivered
            ? 'bg-emerald-950/95 border-emerald-500/80 text-white'
            : 'bg-slate-900/95 border-amber-500/80 text-white'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${sentFeedback.delivered ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'}`}>
                {sentFeedback.delivered ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-400">
                  {sentFeedback.delivered ? 'SMS Wysłany przez Bramkę GSM!' : 'Powiadomienie Zarejestrowane!'}
                </span>
                <h4 className="text-xs font-bold leading-tight text-white">{sentFeedback.title}</h4>
              </div>
            </div>
            <button 
              onClick={() => setSentFeedback(null)}
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="mt-2 text-[11px] text-slate-300 leading-relaxed font-mono bg-slate-950/50 p-2 rounded-lg border border-slate-800">
            {sentFeedback.message}
          </p>
        </div>
      )}

      {/* Real-time Toast Alert */}
      <LiveAlertToast
        deal={liveToastDeal}
        targetPhone={targetPhone}
        onClose={() => setLiveToastDeal(null)}
        onOpenDetails={(deal) => {
          setSelectedCalcCar(deal);
          setIsCalcOpen(true);
          setLiveToastDeal(null);
        }}
      />

    </div>
  );
}
