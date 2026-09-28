import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bell, 
  Phone, 
  Send, 
  CheckCircle2, 
  ExternalLink, 
  Clock, 
  ShieldAlert, 
  Sparkles,
  Zap,
  Radio,
  Server,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { NotificationLog, SmsGatewayConfig } from '../types';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPhone: string;
  onUpdatePhone: (phone: string) => void;
  logs: NotificationLog[];
  onTriggerTestSms: () => void;
  autoAlertEnabled: boolean;
  onToggleAutoAlert: (enabled: boolean) => void;
  minScoreThreshold: number;
  onChangeScoreThreshold: (score: number) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  targetPhone,
  onUpdatePhone,
  logs,
  onTriggerTestSms,
  autoAlertEnabled,
  onToggleAutoAlert,
  minScoreThreshold,
  onChangeScoreThreshold
}) => {
  const [testSent, setTestSent] = useState(false);
  const [testResult, setTestResult] = useState<{
    delivered: boolean;
    provider?: string;
    message: string;
    smsDirectUri?: string;
    whatsappUri?: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [editingPhone, setEditingPhone] = useState(targetPhone);
  const [isEditing, setIsEditing] = useState(false);
  const [gatewayConfig, setGatewayConfig] = useState<SmsGatewayConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  const fetchConfig = () => {
    setIsLoadingConfig(true);
    fetch('/api/notifications/config')
      .then((r) => r.json())
      .then((data) => setGatewayConfig(data))
      .catch((err) => console.warn('Failed to load gateway config:', err))
      .finally(() => setIsLoadingConfig(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  useEffect(() => {
    setEditingPhone(targetPhone);
  }, [targetPhone]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/notify-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carTitle: '2023 Ford Mustang Mach-E Premium AWD (AUKCJA TESTOWA)',
          vin: '1FMTV3SU5PMA19284',
          lotNumber: '89102431',
          auctionPlatform: 'Copart',
          auctionUrl: 'https://www.copart.com/lot/89102431',
          estimatedProfitPln: 48900,
          dealScore: 96,
          targetPhone,
          channel: 'SMS'
        })
      });
      const data = await res.json();
      setTestResult({
        delivered: !!data.delivered,
        provider: data.provider,
        message: data.message || 'Powiadomienie zostało przetworzone.',
        smsDirectUri: data.smsDirectUri,
        whatsappUri: data.whatsappUri
      });
      setTestSent(true);
      onTriggerTestSms();
      fetchConfig();
    } catch (err: any) {
      setTestResult({
        delivered: false,
        message: `Błąd połączenia: ${err.message}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSavePhone = () => {
    onUpdatePhone(editingPhone);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div 
        id="notification-settings-modal"
        className="bg-slate-900 border border-slate-750 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-white my-8 max-h-[90vh] overflow-y-auto"
      >
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Automatyczne Powiadomienia o Aukcjach
              </h2>
              <p className="text-xs text-slate-400">
                Prawdziwe powiadomienia SMS i alerty o okazjach z aukcji USA bezpośrednio na Twój telefon
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

        {/* GSM Gateway Status Bar */}
        <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-750 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-amber-400" />
              Stan Bramki Komórkowej GSM
            </span>
            <button 
              onClick={fetchConfig} 
              disabled={isLoadingConfig}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingConfig ? 'animate-spin' : ''}`} />
              <span>Odśwież stan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Twilio Status */}
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${gatewayConfig?.twilioConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                <span className="font-semibold text-slate-300">Bramka Twilio SMS</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${gatewayConfig?.twilioConfigured ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                {gatewayConfig?.twilioConfigured ? 'AKTYWNA' : 'Brak klucza'}
              </span>
            </div>

            {/* SMSAPI.pl Status */}
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${gatewayConfig?.smsApiConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                <span className="font-semibold text-slate-300">Bramka SMSAPI.pl</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${gatewayConfig?.smsApiConfigured ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                {gatewayConfig?.smsApiConfigured ? 'AKTYWNA' : 'Brak tokena'}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800 leading-relaxed">
            {gatewayConfig?.activeProvider !== 'None' ? (
              <span className="text-emerald-300 font-medium">
                ✅ Bramka serwerowa jest w pełni skonfigurowana! Nowe powiadomienia są automatycznie wysyłane przez sieć komórkową na numer {targetPhone}.
              </span>
            ) : (
              <span>
                💡 <strong>Tryb natychmiastowej wysyłki mobilnej:</strong> Alerty możesz wysyłać 1 dotknięciem palca z aplikacji SMS w telefonie lub WhatsApp. Aby serwer wysyłał SMS-y samoczynnie w tle przez sieć komórkową, dodaj <code className="text-amber-300">TWILIO_ACCOUNT_SID</code> lub <code className="text-amber-300">SMSAPI_TOKEN</code> w panelu Ustawień.
              </span>
            )}
          </div>
        </div>

        {/* Target Number Display & Edit */}
        <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Docelowy numer telefonu dla alertów
            </span>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium"
              >
                Zmień numer
              </button>
            ) : (
              <button
                onClick={handleSavePhone}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
              >
                Zapisz
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Phone className="w-5 h-5" />
            </div>
            {isEditing ? (
              <input
                type="text"
                value={editingPhone}
                onChange={(e) => setEditingPhone(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-base font-mono font-bold text-white focus:outline-none focus:border-amber-500"
              />
            ) : (
              <div className="flex-1">
                <span className="text-xl font-mono font-bold text-amber-400 tracking-tight">
                  {targetPhone}
                </span>
                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Podłączony numer odbiorcy
                </span>
              </div>
            )}
          </div>

          {/* Direct Trigger Buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="flex-1 min-w-[200px] flex items-center justify-center gap-2 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Trwa wysyłanie SMS...' : `Testuj powiadomienie przez bramkę na ${targetPhone}`}</span>
            </button>
          </div>

          {/* Test Dispatch Feedback Result */}
          {testResult && (
            <div className={`p-3 rounded-xl border text-xs space-y-2 ${
              testResult.delivered 
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' 
                : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
            }`}>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-white text-xs">
                    {testResult.delivered ? 'SMS Wysłany Pomyślnie przez Bramkę!' : 'Alert Zarejestrowany w Systemie!'}
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {testResult.message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Automation Criteria */}
        <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3 text-xs">
          <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
            Reguły automatycznego wysyłania alertów
          </h4>

          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium">
              Automatyczne powiadomienia, gdy AI wykryje okazję:
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoAlertEnabled}
                onChange={(e) => onToggleAutoAlert(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-750 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-slate-400">
              <span>Minimalna ocena AI do powiadomienia:</span>
              <span className="font-bold text-amber-400 font-mono text-sm">{minScoreThreshold}/100</span>
            </div>
            <input
              type="range"
              min="70"
              max="98"
              value={minScoreThreshold}
              onChange={(e) => onChangeScoreThreshold(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>70 (Wszystkie okazje)</span>
              <span>85 (Tylko bardzo dobre)</span>
              <span>95 (Ścisłe perły rynkowe)</span>
            </div>
          </div>
        </div>

        {/* History of Sent Notifications */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Historia Wysłanych Powiadomień ({logs.length})
            </h4>
            <span className="text-[11px] text-slate-500">Odbiorca: {targetPhone}</span>
          </div>

          <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
            {logs.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                Brak wysłanych powiadomień w tej sesji.
              </div>
            ) : (
              logs.map((log) => (
                <div 
                  key={log.id} 
                  className="p-3 rounded-lg bg-slate-800/80 border border-slate-750 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{log.carTitle}</span>
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      {log.status}
                    </span>
                  </div>

                  <p className="text-slate-400 text-[11px] leading-relaxed font-mono bg-slate-900/80 p-2 rounded border border-slate-800">
                    {log.messageText}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(log.timestamp).toLocaleTimeString('pl-PL')}
                    </span>

                    <div className="flex items-center gap-2">
                      <a
                        href={log.auctionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                      >
                        <span>Przejdź do aukcji</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs rounded-lg transition-colors"
          >
            Zamknij
          </button>
        </div>

      </div>
    </div>
  );
};
