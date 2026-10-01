import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface AiSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyQueryFilter: (term: string) => void;
}

export const AiSearchModal: React.FC<AiSearchModalProps> = ({
  isOpen,
  onClose,
  onApplyQueryFilter
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  if (!isOpen) return null;

  const predefinedQueries = [
    '🏍️ Wyszukaj najlepsze okazje motocyklowe: Harley-Davidson, BMW GS, Ducati (0% akcyzy w Polsce!)',
    'Wyselekcjonuj 50 najlepszych okazji z aukcji Copart i IAAI pod kątem zysku w Polsce',
    'Dlaczego motocykle z USA mają 0% akcyzy w Polsce i jak wyliczyć ich zysk?',
    'Harley-Davidson Fat Boy 114 z Copart – cło 6%, 0% akcyzy i koszt skrzyni transportowej',
    'Samochody do 2.0L z najniższą akcyzą (3.1%), zyskiem powyżej 30 tys. PLN i tanim transportem morskim',
    'Jaki jest dokładny koszt dostawy z portu w New Jersey do Warszawy i jak go zminimalizować?',
    'Ford Mustang GT 5.0 V8 z portu New Jersey – kalkulacja licytacji, cła i dostawy pod dom',
    'Elektryki Tesla z zerową akcyzą i uszkodzeniem tylko gradowym'
  ];

  const handleAsk = async (queryToAsk: string) => {
    if (!queryToAsk.trim()) return;
    setIsLoading(true);
    setResponse(null);

    try {
      const res = await fetch('/api/ai-search-deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryToAsk })
      });
      const data = await res.json();
      setResponse(data.advice || 'Brak odpowiedzi od AI.');
    } catch (err: any) {
      setResponse('Przepraszamy, wystąpił chwilowy błąd podczas zapytania do Gemini AI.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div 
        id="ai-search-modal"
        className="bg-slate-900 border border-slate-750 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-white my-8 max-h-[90vh] overflow-y-auto"
      >
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                AI Doradca Zakupowy USA
              </h2>
              <p className="text-xs text-slate-400">
                Wspomagany przez Gemini 3.8 Flash • Baza wiedzy o cłach, akcyzie i aukcjach
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

        {/* Featured Top 50 Action Button */}
        <button
          onClick={() => {
            const q = 'Wyselekcjonuj 50 najlepszych okazji z aukcji Copart i IAAI pod kątem zysku w Polsce';
            setPrompt(q);
            handleAsk(q);
            onApplyQueryFilter('');
          }}
          className="w-full p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-left flex items-center justify-between group transition-all"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500 text-slate-950 font-black">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-xs block group-hover:text-amber-300 transition-colors">
                Wyszukaj 50 Najlepszych Okazji AI z USA
              </span>
              <span className="text-[10px] text-slate-400 block">
                Automatyczny dobór: najwyższy zysk, Run & Drive, akcyza 3.1% lub 0% EV, czysty tytuł
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
        </button>

        {/* Query Input */}
        <div className="space-y-2">
          <div className="relative">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Wpisz kryteria, np.: 'Szukam auta 4x4 z portu New Jersey do 18 000 USD z prostą naprawą i silnikiem do 2 litrów pod niską akcyzę'..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => handleAsk(prompt)}
              disabled={isLoading || !prompt.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analizuję rynek...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Zapytaj AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Szybkie zapytania:
          </span>
          <div className="flex flex-col gap-1.5">
            {predefinedQueries.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setPrompt(q);
                  handleAsk(q);
                }}
                className="text-left p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 text-xs transition-colors flex items-center justify-between group"
              >
                <span>{q}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>

        {/* AI Answer Box */}
        {response && (
          <div className="p-4 rounded-xl bg-slate-850 border border-amber-500/30 text-xs space-y-2 text-slate-200 animate-fadeIn">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Bot className="w-4 h-4" />
              <span>Rekomendacja Gemini AI:</span>
            </div>
            <p className="leading-relaxed whitespace-pre-wrap">{response}</p>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  if (prompt.toLowerCase().includes('mustang')) onApplyQueryFilter('Mustang');
                  else if (prompt.toLowerCase().includes('challenger')) onApplyQueryFilter('Challenger');
                  else if (prompt.toLowerCase().includes('tesla')) onApplyQueryFilter('Tesla');
                  else if (prompt.toLowerCase().includes('bmw')) onApplyQueryFilter('BMW');
                  else onApplyQueryFilter(prompt.split(' ')[0] || '');
                  onClose();
                }}
                className="text-xs text-amber-400 hover:underline font-semibold flex items-center gap-1"
              >
                <span>Zastosuj filtry do listy aukcji</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
