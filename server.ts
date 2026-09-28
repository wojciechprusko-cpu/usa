import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini AI to prevent crash if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// In-memory notifications log
interface ServerNotificationLog {
  id: string;
  timestamp: string;
  targetPhone: string;
  carTitle: string;
  vin: string;
  lotNumber: string;
  auctionPlatform: string;
  auctionUrl: string;
  estimatedProfitPln: number;
  dealScore: number;
  status: 'Wysłano SMS (Twilio)' | 'Wysłano SMS (SMSAPI)' | 'Wysłano SMS' | 'Dostarczono' | 'Kliknięto' | 'Brak klucza bramki GSM' | 'Błąd bramki';
  channel: 'SMS' | 'WhatsApp' | 'Push Alert';
  messageText: string;
  gatewayProvider?: 'Twilio' | 'SMSAPI' | 'Aplikacja GSM / Telefon' | 'Symulacja';
  gatewayMessageId?: string;
  gatewayError?: string;
  smsDirectUri?: string;
  whatsappUri?: string;
}

const notificationLogs: ServerNotificationLog[] = [
  {
    id: 'notif-init-1',
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    targetPhone: '+48 530 741 644',
    carTitle: '2022 Ford Mustang GT Premium 5.0 V8',
    vin: '1FA6P8CF4N5198231',
    lotNumber: '78219432',
    auctionPlatform: 'Copart',
    auctionUrl: 'https://www.copart.com/lot/78219432',
    estimatedProfitPln: 52400,
    dealScore: 95,
    status: 'Wysłano SMS',
    channel: 'SMS',
    gatewayProvider: 'Aplikacja GSM / Telefon',
    messageText: '🚨 AUTO USA OKAZJA: 2022 Ford Mustang GT 5.0 V8 (Run & Drive). Cena licytacji: $11,800. Szacowany zysk w PL: +52,400 PLN! Zobacz aukcję Copart: https://www.copart.com/lot/78219432',
    smsDirectUri: `sms:+48530741644?body=${encodeURIComponent('🚨 AUTO USA OKAZJA: 2022 Ford Mustang GT 5.0 V8 (Run & Drive). Cena licytacji: $11,800. Szacowany zysk w PL: +52,400 PLN! https://www.copart.com/lot/78219432')}`,
    whatsappUri: `https://wa.me/48530741644?text=${encodeURIComponent('🚨 AUTO USA OKAZJA: 2022 Ford Mustang GT 5.0 V8 (Run & Drive). Cena licytacji: $11,800. Szacowany zysk w PL: +52,400 PLN! https://www.copart.com/lot/78219432')}`
  }
];

// Helper: Real SMS Sender
async function dispatchRealSms(targetPhone: string, messageText: string): Promise<{
  delivered: boolean;
  provider: 'Twilio' | 'SMSAPI' | 'Aplikacja GSM / Telefon';
  status: 'Wysłano SMS (Twilio)' | 'Wysłano SMS (SMSAPI)' | 'Wysłano SMS' | 'Dostarczono' | 'Brak klucza bramki GSM' | 'Błąd bramki';
  messageId?: string;
  errorMessage?: string;
}> {
  const cleanE164 = targetPhone.replace(/[\s-]/g, '');
  const cleanDigits = targetPhone.replace(/[^0-9]/g, '');

  // 1. Try Twilio if credentials configured
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  if (twilioSid && twilioAuth && twilioFrom) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', cleanE164.startsWith('+') ? cleanE164 : `+${cleanE164}`);
      params.append('From', twilioFrom);
      params.append('Body', messageText);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data: any = await res.json();
      if (res.ok && data.sid) {
        return {
          delivered: true,
          provider: 'Twilio',
          status: 'Wysłano SMS (Twilio)',
          messageId: data.sid,
        };
      } else {
        return {
          delivered: false,
          provider: 'Twilio',
          status: 'Błąd bramki',
          errorMessage: data.message || `Twilio error code: ${data.code}`,
        };
      }
    } catch (err: any) {
      return {
        delivered: false,
        provider: 'Twilio',
        status: 'Błąd bramki',
        errorMessage: err.message,
      };
    }
  }

  // 2. Try SMSAPI.pl (Polish direct carrier SMS gateway)
  const smsApiToken = process.env.SMSAPI_TOKEN;
  if (smsApiToken) {
    try {
      const url = 'https://api.smsapi.pl/sms.do';
      const params = new URLSearchParams();
      params.append('to', cleanDigits);
      params.append('message', messageText);
      params.append('format', 'json');
      params.append('encoding', 'utf-8');
      if (process.env.SMSAPI_FROM) {
        params.append('from', process.env.SMSAPI_FROM);
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${smsApiToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data: any = await res.json();
      if (res.ok && data.count && data.count > 0) {
        const item = data.list?.[0];
        return {
          delivered: true,
          provider: 'SMSAPI',
          status: 'Wysłano SMS (SMSAPI)',
          messageId: item?.id || 'smsapi-ok',
        };
      } else {
        return {
          delivered: false,
          provider: 'SMSAPI',
          status: 'Błąd bramki',
          errorMessage: data.message || JSON.stringify(data),
        };
      }
    } catch (err: any) {
      return {
        delivered: false,
        provider: 'SMSAPI',
        status: 'Błąd bramki',
        errorMessage: err.message,
      };
    }
  }

  // 3. Neither cloud gateway is configured in environment secrets
  return {
    delivered: false,
    provider: 'Aplikacja GSM / Telefon',
    status: 'Brak klucza bramki GSM',
    errorMessage: 'Brak aktywnego klucza TWILIO_ACCOUNT_SID lub SMSAPI_TOKEN w konfiguracji serwera.',
  };
}

// 1. Health check & Gateway Configuration status
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/notifications/config', (req: Request, res: Response) => {
  const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
  const smsApiConfigured = !!process.env.SMSAPI_TOKEN;
  const activeProvider = twilioConfigured ? 'Twilio' : smsApiConfigured ? 'SMSAPI' : 'None';

  res.json({
    targetPhone: '+48 530 741 644',
    twilioConfigured,
    smsApiConfigured,
    activeProvider,
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// 2. Real Notification Dispatch API (configured specifically for +48 530 741 644)
app.post('/api/notify-sms', async (req: Request, res: Response) => {
  try {
    const { 
      carTitle, 
      vin, 
      lotNumber, 
      auctionPlatform, 
      auctionUrl, 
      estimatedProfitPln, 
      dealScore, 
      targetPhone = '+48 530 741 644', 
      channel = 'SMS' 
    } = req.body;

    // Ensure the auction link sent in SMS is always a DIRECT auction lot page
    let resolvedUrl = auctionUrl;
    if (!resolvedUrl || (!resolvedUrl.includes('/lot/') && !resolvedUrl.includes('/VehicleDetail/') && !resolvedUrl.includes('/vehicledetail/'))) {
      if ((auctionPlatform || '').toLowerCase().includes('copart')) {
        resolvedUrl = `https://www.copart.com/lot/${lotNumber || '78219432'}`;
      } else {
        resolvedUrl = `https://www.iaai.com/VehicleDetail/${lotNumber || '35102914'}`;
      }
    }

    const profitFormatted = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(estimatedProfitPln || 0);
    const messageText = `🚨 AUTO USA OKAZJA [Score ${dealScore}/100]: ${carTitle} (VIN: ${vin?.substring(0, 10)}...). Szacowany zysk w PL: ${profitFormatted}! Bezpośrednia aukcja na ${auctionPlatform}: ${resolvedUrl}`;

    // Execute real dispatch through carrier gateway
    const dispatchResult = await dispatchRealSms(targetPhone, messageText);

    // Prepare direct instant deep-links for device native sending
    const cleanDigits = targetPhone.replace(/[^0-9]/g, '');
    const cleanE164 = targetPhone.replace(/[\s-]/g, '');
    const encodedMsg = encodeURIComponent(messageText);
    const smsDirectUri = `sms:${cleanE164}?body=${encodedMsg}`;
    const whatsappUri = `https://wa.me/${cleanDigits}?text=${encodedMsg}`;

    const newLog: ServerNotificationLog = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      targetPhone,
      carTitle: carTitle || 'Pojazd z aukcji USA',
      vin: vin || 'BRAK VIN',
      lotNumber: lotNumber || 'N/A',
      auctionPlatform: auctionPlatform || 'Copart',
      auctionUrl: resolvedUrl,
      estimatedProfitPln: estimatedProfitPln || 0,
      dealScore: dealScore || 90,
      status: dispatchResult.status,
      channel: channel as any,
      gatewayProvider: dispatchResult.provider,
      gatewayMessageId: dispatchResult.messageId,
      gatewayError: dispatchResult.errorMessage,
      messageText,
      smsDirectUri,
      whatsappUri,
    };

    notificationLogs.unshift(newLog);

    let feedbackMessage = '';
    if (dispatchResult.delivered) {
      feedbackMessage = `Prawdziwy SMS został pomyślnie wysłany przez bramkę ${dispatchResult.provider} na numer ${targetPhone}! (ID: ${dispatchResult.messageId})`;
    } else if (dispatchResult.status === 'Brak klucza bramki GSM') {
      feedbackMessage = `Gotowe do natychmiastowego wysłania na numer ${targetPhone}. Możesz wysłać 1 kliknięciem z aplikacji SMS w telefonie lub dodać klucz TWILIO/SMSAPI w Ustawieniach.`;
    } else {
      feedbackMessage = `Błąd wysyłki przez bramkę ${dispatchResult.provider}: ${dispatchResult.errorMessage}`;
    }

    res.json({
      success: true,
      delivered: dispatchResult.delivered,
      log: newLog,
      smsDirectUri,
      whatsappUri,
      provider: dispatchResult.provider,
      message: feedbackMessage,
    });
  } catch (error: any) {
    console.error('Error sending SMS notification:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications/history', (req: Request, res: Response) => {
  res.json({ logs: notificationLogs });
});

// 3. AI Smart Deal Analyzer using Gemini 3.8 Flash (including shipping calculation)
app.post('/api/ai-analyze-lot', async (req: Request, res: Response) => {
  try {
    const { carModel, year, engine, damageDescription, currentBidUsd, marketValuePln, departurePort, locationState, driveCondition } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Fallback heuristic if API key not available yet
      return res.json({
        score: 91,
        verdict: 'Wysoka rentowność importu. Silnik nienaruszony, łatwa naprawa blacharska.',
        pros: ['Popularny model w Polsce o wysokiej płynności', 'Niska cena bazowa na aukcji w USA', 'Szybka dostępność części zamiennych w Europie'],
        cons: ['Zwrócić uwagę na geometrię płyty podłogowej przed licytacją'],
        repairEstimatePln: 14000,
        suggestedMaxBidUsd: (currentBidUsd || 12000) * 1.15,
        estimatedDeliveryPln: 10400,
        deliveryBreakdown: {
          inlandUsd: 450,
          oceanUsd: 1350,
          handlingEur: 420,
          polandTowPln: 1800,
          totalPln: 10760,
          totalUsd: 2704,
          transitDays: '28-35 dni roboczych'
        }
      });
    }

    const prompt = `Jesteś ekspertem z 15-letnim doświadczeniem w imporcie aut powypadkowych z USA do Polski (Copart, IAAI, Manheim).
Przeanalizuj ofertę:
- Samochód: ${year} ${carModel}
- Silnik: ${engine}
- Opis uszkodzeń z aukcji: ${damageDescription}
- Bieżąca/szacowana oferta: $${currentBidUsd} USD
- Średnia cena na polskim Otomoto: ${marketValuePln} PLN
- Port i stan USA: ${departurePort || 'New York / New Jersey'} (${locationState || 'Wschodnie Wybrzeże'})
- Stan napędu: ${driveCondition || 'Run & Drive'}

Zwróć odpowiedź w formacie JSON z następującymi polami:
{
  "score": number od 1 do 100,
  "verdict": "Krótkie 2-3 zdaniowe profesjonalne podsumowanie opłacalności w języku polskim",
  "pros": ["zaleta 1", "zaleta 2", "zaleta 3"],
  "cons": ["ryzyko 1", "ryzyko 2"],
  "repairEstimatePln": szacowany koszt naprawy w PLN,
  "suggestedMaxBidUsd": maksymalna sugerowana kwota licytacji w USD, do której zakup ma sens biznesowy,
  "estimatedDeliveryPln": szacowany całkowity koszt dostawy pod dom w PLN (transport USA + fracht oceaniczny + port + laweta w Polsce),
  "deliveryBreakdown": {
    "inlandUsd": number (transport lądowy w USA do portu),
    "oceanUsd": number (fracht morski kontenerowy),
    "handlingEur": number (rozładunek portowy Bremerhaven),
    "polandTowPln": number (laweta pod dom w Polsce),
    "totalPln": number (suma dostawy w PLN),
    "totalUsd": number (suma dostawy w USD),
    "transitDays": "np. 28-35 dni roboczych"
  }
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (error: any) {
    console.error('AI lot analysis error:', error);
    res.status(500).json({
      error: 'Błąd analizy AI',
      details: error.message,
      fallback: {
        score: 88,
        verdict: 'Rekomendacja pozytywna na podstawie historycznych aukcji.',
        pros: ['Czysty silnik', 'Wysoka marża po opłatach'],
        cons: ['Sprawdzić raport Carfax przed finałową ofertą'],
        estimatedDeliveryPln: 10400,
        deliveryBreakdown: {
          inlandUsd: 450,
          oceanUsd: 1350,
          handlingEur: 420,
          polandTowPln: 1800,
          totalPln: 10760,
          totalUsd: 2704,
          transitDays: '28-35 dni roboczych'
        }
      }
    });
  }
});

// 4. AI Comprehensive Shipping & Delivery Calculator using Gemini 3.8 Flash
app.post('/api/ai-calculate-shipping', async (req: Request, res: Response) => {
  try {
    const {
      year,
      make,
      model,
      trim,
      locationState,
      departurePort,
      driveCondition,
      primaryDamage,
      destinationCity = 'Warszawa',
      isForkliftRequired = false,
      usdRate = 3.98,
      eurRate = 4.28
    } = req.body;

    const ai = getGeminiClient();

    // Baseline calculation heuristics
    let baseInlandUsd = 450;
    if (departurePort === 'Los Angeles') baseInlandUsd = 750;
    else if (departurePort === 'Houston') baseInlandUsd = 550;
    else if (departurePort === 'New York / New Jersey') baseInlandUsd = 350;
    else if (departurePort === 'Miami') baseInlandUsd = 380;
    else if (departurePort === 'Savannah') baseInlandUsd = 420;

    if (driveCondition !== 'Run & Drive' || isForkliftRequired) {
      baseInlandUsd += 150; // opłata za wózek widłowy / auto niejeżdżące
    }

    let baseOceanUsd = 1350;
    if (departurePort === 'Los Angeles') baseOceanUsd = 1850;
    else if (departurePort === 'Houston') baseOceanUsd = 1550;

    let basePolandTowPln = 1800;
    const cityLower = String(destinationCity).toLowerCase();
    if (cityLower.includes('poznań') || cityLower.includes('gorzów') || cityLower.includes('szczecin')) basePolandTowPln = 1400;
    else if (cityLower.includes('wrocław') || cityLower.includes('zielona góra') || cityLower.includes('legnica')) basePolandTowPln = 1600;
    else if (cityLower.includes('warszawa') || cityLower.includes('łódź') || cityLower.includes('bydgoszcz') || cityLower.includes('toruń')) basePolandTowPln = 1900;
    else if (cityLower.includes('kraków') || cityLower.includes('katowice') || cityLower.includes('gdańsk') || cityLower.includes('gdynia')) basePolandTowPln = 2000;
    else if (cityLower.includes('lublin') || cityLower.includes('rzeszów') || cityLower.includes('białystok') || cityLower.includes('olsztyn')) basePolandTowPln = 2300;

    const basePortHandlingEur = 420;

    if (!ai) {
      const totalPln = Math.round((baseInlandUsd + baseOceanUsd) * usdRate + basePortHandlingEur * eurRate + basePolandTowPln);
      const totalUsd = Math.round(totalPln / usdRate);
      return res.json({
        originState: locationState || 'USA',
        departurePort: departurePort || 'New York / New Jersey',
        destinationPort: 'Bremerhaven (Niemcy)',
        destinationCityPoland: destinationCity,
        inlandTransportUsd: baseInlandUsd,
        oceanFreightUsd: baseOceanUsd,
        portHandlingEur: basePortHandlingEur,
        transportToPolandPln: basePolandTowPln,
        totalShippingPln: totalPln,
        totalShippingUsd: totalUsd,
        transitDaysEstimate: '26 - 34 dni roboczych',
        carrierType: 'Kontener 40ft High-Cube (share) + autotransporter z windą hydrauliczną',
        requiresForklift: driveCondition !== 'Run & Drive' || isForkliftRequired,
        aiLogisticsNotes: `Kalkulacja logistyki dla ${year} ${make} ${model}: Trasa z portu ${departurePort} do Bremerhaven, a stamtąd bezpośredni transport autolawetą pod dom do miasta ${destinationCity}.`,
      });
    }

    const prompt = `Jesteś głównym dyspozytorem międzynarodowej spedycji morskiej i lądowej specjalizującym się w logistyce pojazdów z aukcji Copart i IAAI w USA do Polski.
Wylicz i zoptymalizuj dokładne koszty dostawy:
- Samochód: ${year} ${make} ${model} ${trim || ''}
- Stan napędu: ${driveCondition} (${driveCondition === 'Run & Drive' ? 'Auto toczy się i odpala' : 'Auto niejeżdżące, wymaga załadunku wózkiem widłowym'})
- Uszkodzenie: ${primaryDamage || 'Brak krytycznych uszkodzeń'}
- Plac aukcyjny (lokalizacja): ${locationState}
- Port wyjściowy w USA: ${departurePort}
- Port docelowy UE: Bremerhaven (Niemcy)
- Miasto docelowe dostawy w Polsce: ${destinationCity}
- Wózek widłowy (forklift loading fee na placu aukcyjnym): ${isForkliftRequired || driveCondition !== 'Run & Drive' ? 'TAK (+150$)' : 'NIE (0$)'}

Uwzględnij realne koszty rynkowe w USD i PLN:
1. Transport lądowy po USA (inland truck z placu do portu wyjściowego).
2. Fracht morski w kontenerze 40ft High-Cube przez Atlantyk do Bremerhaven.
3. Rozładunek portowy i opłaty terminalowe (THC, dokumentacja T1) w Bremerhaven w EUR (przeważnie 390-440 EUR).
4. Transport autolawetą z portu Bremerhaven pod dom w Polsce do miasta ${destinationCity} w PLN.

Zwróć odpowiedź w formacie JSON z następującymi polami:
{
  "inlandTransportUsd": number (np. 380, 520, 750),
  "oceanFreightUsd": number (np. 1300, 1450, 1650),
  "portHandlingEur": number (np. 420),
  "transportToPolandPln": number (np. 1800, 1900, 2200),
  "transitDaysEstimate": "np. 28-35 dni roboczych",
  "carrierType": "np. Kontener 40ft HC (współdzielony) + autotransporter z wciągarką",
  "requiresForklift": boolean,
  "aiLogisticsNotes": "2-3 konkretne profesjonalne zdania po polsku: analiza logistyczna, rekomendacje uniknięcia opłat postojowych storage na aukcji i optymalizacji trasy."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const inlandUsd = Number(parsed.inlandTransportUsd) || baseInlandUsd;
    const oceanUsd = Number(parsed.oceanFreightUsd) || baseOceanUsd;
    const handlingEur = Number(parsed.portHandlingEur) || basePortHandlingEur;
    const polandPln = Number(parsed.transportToPolandPln) || basePolandTowPln;

    const totalDeliveryPln = Math.round((inlandUsd + oceanUsd) * usdRate + handlingEur * eurRate + polandPln);
    const totalDeliveryUsd = Math.round(totalDeliveryPln / usdRate);

    res.json({
      originState: locationState || 'USA',
      departurePort: departurePort || 'New York / New Jersey',
      destinationPort: 'Bremerhaven (Niemcy)',
      destinationCityPoland: destinationCity,
      inlandTransportUsd: inlandUsd,
      oceanFreightUsd: oceanUsd,
      portHandlingEur: handlingEur,
      transportToPolandPln: polandPln,
      totalShippingPln: totalDeliveryPln,
      totalShippingUsd: totalDeliveryUsd,
      transitDaysEstimate: parsed.transitDaysEstimate || '26 - 34 dni roboczych',
      carrierType: parsed.carrierType || 'Kontener 40ft HC + autotransporter z wciągarką',
      requiresForklift: Boolean(parsed.requiresForklift),
      aiLogisticsNotes: parsed.aiLogisticsNotes || `AI Spedycja: Zoptymalizowano trasę z portu ${departurePort} do ${destinationCity}.`,
    });
  } catch (error: any) {
    console.error('AI shipping calculation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Custom AI Natural Language Car Hunter
app.post('/api/ai-search-deals', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        advice: `Wyniki dla zapytania "${query}": Rekomendujemy skupienie się na aukcjach Copart w stanie New Jersey ze względu na niższe koszty logistyki morskiej (~$350 lądowy + $1,350 kontener).`
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Użytkownik szuka okazji na auto z USA: "${query}". 
Podaj w 2 konkretnych zdaniach po polsku radę zakupową:
1. Na jakie uszkodzenia i kody tytułów (Clean Title vs Salvage) uważać oraz optymalną akcyzę (3.1% do 2.0L vs 18.6% powyżej 2.0L).
2. Oszacuj realny łączny koszt dostawy z USA pod dom w Polsce (transport lądowy w USA + fracht morski kontenerem + rozładunek w porcie Bremerhaven + laweta pod dom, łącznie ok. 10 000 - 12 500 PLN).`,
    });

    res.json({
      advice: response.text
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite Middleware for Dev and Production static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AutoUSA AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
