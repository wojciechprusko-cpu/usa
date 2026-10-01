import React from 'react';
import { ShieldCheck, Bell, Sparkles, FileSpreadsheet, ExternalLink, LogIn, LogOut, Radio } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  user: User | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  spreadsheetUrl: string | null;
  onOpenNotifications: () => void;
  notificationCount: number;
  totalDealsCount: number;
  maxProfitPln: number;
  onOpenAiSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  needsAuth,
  isLoggingIn,
  onLogin,
  onLogout,
  spreadsheetUrl,
  onOpenNotifications,
  notificationCount,
  totalDealsCount,
  maxProfitPln,
  onOpenAiSearch,
}) => {
  return (
    <header className="bg-slate-900/95 border-b border-slate-800 text-white sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5">
        <div className="flex items-center justify-between gap-3">
          
          {/* Brand & Live status */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-sm sm:text-base tracking-tighter">
              USA
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  AutoUSA AI
                </span>
                <span className="flex h-2 w-2 relative" title="Live Scanner Aktywny">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="hidden sm:inline-flex text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20 items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Live Scanner
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:flex items-center gap-2">
                <span className="text-emerald-400 font-medium">Copart · IAAI · Manheim</span>
                <span>• Odprawa Bremerhaven & Gdynia</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics - Desktop Only */}
          <div className="hidden lg:flex items-center gap-6 px-4 py-1.5 rounded-lg bg-slate-850/80 border border-slate-750 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Top Okazje AI (Auta & Motory)</span>
              <span className="font-bold text-amber-300 text-sm tabular-nums">{totalDealsCount} pojazdów</span>
            </div>
            <div className="h-6 w-px bg-slate-700"></div>
            <div>
              <span className="text-slate-400 block text-[11px]">Maks. zysk w PL</span>
              <span className="font-bold text-emerald-400 text-sm tabular-nums">
                +{new Intl.NumberFormat('pl-PL').format(maxProfitPln)} PLN
              </span>
            </div>
          </div>

          {/* Actions: Notifications & Google Sheets */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            
            {/* Quick AI Search Button on Mobile */}
            {onOpenAiSearch && (
              <button
                onClick={onOpenAiSearch}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 active:scale-95 transition-transform"
                title="AI Asystent Aukcji"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            )}

            {/* Phone Alert Badge button */}
            <button
              id="header-notification-btn"
              onClick={onOpenNotifications}
              className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-amber-500/30 text-amber-300 hover:text-white transition-all text-xs font-semibold shadow-sm active:scale-95"
              title="Konfiguracja powiadomień SMS / WhatsApp (+48 530 741 644)"
            >
              <div className="relative">
                <Bell className="w-4 h-4 text-amber-400" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </div>
              <span className="hidden sm:inline text-slate-300">Alerty:</span>
              <span className="font-mono text-amber-300 font-bold tracking-tight text-[11px] sm:text-xs">
                {notificationCount > 0 ? `${notificationCount}` : 'SMS'}
              </span>
            </button>

            {/* Google Sheets Status / Auth Button */}
            {user ? (
              <div className="flex items-center gap-1 sm:gap-2">
                {spreadsheetUrl && (
                  <a
                    id="header-open-sheet-btn"
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition-colors"
                    title="Otwórz Twój arkusz w Google Sheets"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="hidden sm:inline">Arkusz</span>
                    <ExternalLink className="w-3 h-3 opacity-70 hidden sm:inline" />
                  </a>
                )}
                <button
                  id="header-logout-btn"
                  onClick={onLogout}
                  className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white text-xs transition-colors"
                  title={`Wyloguj (${user.email || user.displayName})`}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="header-google-signin-btn"
                onClick={onLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold shadow transition-all disabled:opacity-50 active:scale-95"
                title="Zaloguj przez Google by eksportować do Google Sheets"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden sm:inline">{isLoggingIn ? 'Logowanie...' : 'Google Sheets'}</span>
                <span className="sm:hidden text-[11px] font-bold">Sheets</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
