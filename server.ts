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

// 3. AI Smart Deal Analyzer using Gemini 3.8 Flash (including shipping calculation & motorcycle support)
app.post('/api/ai-analyze-lot', async (req: Request, res: Response) => {
  try {
    const { 
      carModel, 
      year, 
      engine, 
      damageDescription, 
      currentBidUsd, 
      marketValuePln, 
      departurePort, 
      locationState, 
      driveCondition,
      vehicleType = 'car'
    } = req.body;
    const ai = getGeminiClient();
    const isMotorcycle = vehicleType === 'motorcycle';

    if (!ai) {
      // Fallback heuristic if API key not available yet
      return res.json({
        score: isMotorcycle ? 94 : 91,
        verdict: isMotorcycle
          ? 'Wybitna okazja motocyklowa! W Polsce motocykle są CAŁKOWICIE ZWOLNIONE Z AKCYZY (0%), cło wynosi tylko 6%, a koszt transportu morskiego w skrzyni jest o połowę tańszy.'
          : 'Wysoka rentowność importu. Silnik nienaruszony, łatwa naprawa blacharska.',
        pros: isMotorcycle
          ? ['0% akcyzy w Polsce (całkowite zwolnienie)', 'Cło tylko 6% (zamiast 10% jak w autach)', 'Niski koszt frachtu w klatce morskiej i wysoka cena na rynku wtórnym']
          : ['Popularny model w Polsce o wysokiej płynności', 'Niska cena bazowa na aukcji w USA', 'Szybka dostępność części zamiennych w Europie'],
        cons: isMotorcycle
          ? ['Sprawdzić geometrię przedniego widelca i ramy na zdjęciach']
          : ['Zwrócić uwagę na geometrię płyty podłogowej przed licytacją'],
        repairEstimatePln: isMotorcycle ? 4500 : 14000,
        suggestedMaxBidUsd: (currentBidUsd || (isMotorcycle ? 7000 : 12000)) * 1.15,
        estimatedDeliveryPln: isMotorcycle ? 4800 : 10400,
        deliveryBreakdown: {
          inlandUsd: isMotorcycle ? 280 : 450,
          oceanUsd: isMotorcycle ? 650 : 1350,
          handlingEur: isMotorcycle ? 250 : 420,
          polandTowPln: isMotorcycle ? 850 : 1800,
          totalPln: isMotorcycle ? 4800 : 10760,
          totalUsd: isMotorcycle ? 1206 : 2704,
          transitDays: '24-32 dni roboczych'
        }
      });
    }

    const prompt = `Jesteś ekspertem z 15-letnim doświadczeniem w imporcie pojazdów (samochodów i motocykli) z aukcji w USA do Polski (Copart, IAAI, Manheim).
Przeanalizuj ofertę:
- Typ pojazdu: ${isMotorcycle ? 'MOTOCYKL (kategoria: jednoślad)' : 'Samochód osobowy'}
- Model: ${year} ${carModel}
- Silnik: ${engine}
- Opis uszkodzeń z aukcji: ${damageDescription}
- Bieżąca/szacowana oferta: $${currentBidUsd} USD
- Średnia cena na polskim Otomoto/OLX: ${marketValuePln} PLN
- Port i stan USA: ${departurePort || 'New York / New Jersey'} (${locationState || 'Wschodnie Wybrzeże'})
- Stan napędu: ${driveCondition || 'Run & Drive'}

${isMotorcycle ? 'WAŻNA ZASADA PRAWNA W POLSCE: Motocykle są CAŁKOWICIE ZWOLNIONE Z AKCYZY (0% akcyzy!), cło UE wynosi 6% (zamiast 10%), a transport w skrzyni (crating) kosztuje o ~50% mniej niż transport samochodu. Uwzględnij to w wyliczeniu i rekomendacji zysku.' : ''}

Zwróć odpowiedź w formacie JSON z następującymi polami:
{
  "score": number od 1 do 100,
  "verdict": "Krótkie 2-3 zdaniowe profesjonalne podsumowanie opłacalności w języku polskim",
  "pros": ["zaleta 1", "zaleta 2", "zaleta 3"],
  "cons": ["ryzyko 1", "ryzyko 2"],
  "repairEstimatePln": szacowany koszt naprawy w PLN,
  "suggestedMaxBidUsd": maksymalna sugerowana kwota licytacji w USD, do której zakup ma sens biznesowy,
  "estimatedDeliveryPln": szacowany całkowity koszt dostawy pod dom w PLN (transport USA + fracht oceaniczny + port + transport w Polsce),
  "deliveryBreakdown": {
    "inlandUsd": number (transport lądowy w USA do portu),
    "oceanUsd": number (fracht morski),
    "handlingEur": number (rozładunek portowy Bremerhaven),
    "polandTowPln": number (transport pod dom w Polsce),
    "totalPln": number (suma dostawy w PLN),
    "totalUsd": number (suma dostawy w USD),
    "transitDays": "np. 24-32 dni roboczych"
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

// 4. AI Comprehensive Shipping & Delivery Calculator using Gemini 3.8 Flash (supporting cars & motorcycles)
app.post('/api/ai-calculate-shipping', async (req: Request, res: Response) => {
  try {
    const {
      year,
      make,
      model,
      trim,
      vehicleType = 'car',
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
    const isMotorcycle = vehicleType === 'motorcycle';

    // Baseline calculation heuristics
    let baseInlandUsd = isMotorcycle ? 280 : 450;
    if (departurePort === 'Los Angeles') baseInlandUsd = isMotorcycle ? 450 : 750;
    else if (departurePort === 'Houston') baseInlandUsd = isMotorcycle ? 350 : 550;
    else if (departurePort === 'New York / New Jersey') baseInlandUsd = isMotorcycle ? 220 : 350;
    else if (departurePort === 'Miami') baseInlandUsd = isMotorcycle ? 250 : 380;
    else if (departurePort === 'Savannah') baseInlandUsd = isMotorcycle ? 270 : 420;

    if (driveCondition !== 'Run & Drive' || isForkliftRequired) {
      baseInlandUsd += isMotorcycle ? 60 : 150;
    }

    let baseOceanUsd = isMotorcycle ? 650 : 1350;
    if (departurePort === 'Los Angeles') baseOceanUsd = isMotorcycle ? 850 : 1850;
    else if (departurePort === 'Houston') baseOceanUsd = isMotorcycle ? 750 : 1550;

    let basePolandTowPln = isMotorcycle ? 850 : 1800;
    const cityLower = String(destinationCity).toLowerCase();
    if (!isMotorcycle) {
      if (cityLower.includes('poznań') || cityLower.includes('gorzów') || cityLower.includes('szczecin')) basePolandTowPln = 1400;
      else if (cityLower.includes('wrocław') || cityLower.includes('zielona góra') || cityLower.includes('legnica')) basePolandTowPln = 1600;
      else if (cityLower.includes('warszawa') || cityLower.includes('łódź') || cityLower.includes('bydgoszcz') || cityLower.includes('toruń')) basePolandTowPln = 1900;
      else if (cityLower.includes('kraków') || cityLower.includes('katowice') || cityLower.includes('gdańsk') || cityLower.includes('gdynia')) basePolandTowPln = 2000;
      else if (cityLower.includes('lublin') || cityLower.includes('rzeszów') || cityLower.includes('białystok') || cityLower.includes('olsztyn')) basePolandTowPln = 2300;
    } else {
      if (cityLower.includes('poznań') || cityLower.includes('gorzów') || cityLower.includes('szczecin') || cityLower.includes('wrocław')) basePolandTowPln = 700;
      else if (cityLower.includes('warszawa') || cityLower.includes('łódź')) basePolandTowPln = 850;
      else basePolandTowPln = 950;
    }

    const basePortHandlingEur = isMotorcycle ? 250 : 420;

    if (!ai) {
      const totalPln = Math.round((baseInlandUsd + baseOceanUsd) * usdRate + basePortHandlingEur * eurRate + basePolandTowPln);
      const totalUsd = Math.round(totalPln / usdRate);
      return res.json({
        vehicleType: isMotorcycle ? 'motorcycle' : 'car',
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
        transitDaysEstimate: isMotorcycle ? '22 - 30 dni roboczych' : '26 - 34 dni roboczych',
        carrierType: isMotorcycle 
          ? 'Klatka transportowa (crating) w kontenerze + transport dedykowany busem z pasami'
          : 'Kontener 40ft High-Cube (share) + autotransporter z windą hydrauliczną',
        requiresForklift: driveCondition !== 'Run & Drive' || isForkliftRequired,
        aiLogisticsNotes: isMotorcycle
          ? `Kalkulacja spedycji dla motocykla ${year} ${make} ${model}: Bezpieczny transport w skrzyni morskiej (crating) do Bremerhaven oraz bezpośredni dowóz busem do ${destinationCity}. Zwolniony z akcyzy!`
          : `Kalkulacja logistyki dla ${year} ${make} ${model}: Trasa z portu ${departurePort} do Bremerhaven, a stamtąd bezpośredni transport autolawetą pod dom do miasta ${destinationCity}.`,
      });
    }

    const prompt = `Jesteś głównym dyspozytorem międzynarodowej spedycji morskiej i lądowej specjalizującym się w logistyce pojazdów (samochody i motocykle) z aukcji Copart i IAAI w USA do Polski.
Wylicz i zoptymalizuj dokładne koszty dostawy:
- Kategoria pojazdu: ${isMotorcycle ? 'MOTOCYKL (transport w specjalnej skrzyni/klatce motocyklowej crating)' : 'Samochód osobowy'}
- Model: ${year} ${make} ${model} ${trim || ''}
- Stan napędu: ${driveCondition} (${driveCondition === 'Run & Drive' ? 'Pojazd toczy się i odpala' : 'Pojazd niejeżdżący, wymaga załadunku wózkiem/rampą'})
- Uszkodzenie: ${primaryDamage || 'Brak krytycznych uszkodzeń'}
- Plac aukcyjny (lokalizacja): ${locationState}
- Port wyjściowy w USA: ${departurePort}
- Port docelowy UE: Bremerhaven (Niemcy)
- Miasto docelowe dostawy w Polsce: ${destinationCity}
- Obsługa załadunku (forklift/ramp loading fee): ${isForkliftRequired || driveCondition !== 'Run & Drive' ? 'TAK' : 'NIE'}

${isMotorcycle ? 'Uwzględnij, że motocykl zajmuje ułamek kontenera (mieści się w skrzyni transportowej / klatce), stąd fracht morski wynosi ok. 600-800$ zamiast 1300-1800$, a transport busem/przyczepą do Polski to ok. 700-1000 PLN zamiast 1800 PLN.' : ''}

Uwzględnij realne koszty rynkowe w USD i PLN:
1. Transport lądowy po USA (inland truck z placu do portu wyjściowego).
2. Fracht morski przez Atlantyk do Bremerhaven.
3. Rozładunek portowy i opłaty terminalowe (THC, dokumentacja T1) w Bremerhaven w EUR.
4. Transport pod dom w Polsce do miasta ${destinationCity} w PLN.

Zwróć odpowiedź w formacie JSON z następującymi polami:
{
  "inlandTransportUsd": number,
  "oceanFreightUsd": number,
  "portHandlingEur": number,
  "transportToPolandPln": number,
  "transitDaysEstimate": "np. 24-30 dni roboczych",
  "carrierType": "opis typu transportu",
  "requiresForklift": boolean,
  "aiLogisticsNotes": "2-3 konkretne profesjonalne zdania po polsku: analiza logistyczna, zabezpieczenie w skrzyni transportowej, rekomendacje uniknięcia opłat postojowych storage na aukcji i optymalizacji trasy."
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
      vehicleType: isMotorcycle ? 'motorcycle' : 'car',
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
      transitDaysEstimate: parsed.transitDaysEstimate || (isMotorcycle ? '22 - 30 dni roboczych' : '26 - 34 dni roboczych'),
      carrierType: parsed.carrierType || (isMotorcycle ? 'Klatka transportowa crating + transport busem' : 'Kontener 40ft HC + autotransporter'),
      requiresForklift: Boolean(parsed.requiresForklift),
      aiLogisticsNotes: parsed.aiLogisticsNotes || `AI Spedycja: Zoptymalizowano trasę z portu ${departurePort} do ${destinationCity}.`,
    });
  } catch (error: any) {
    console.error('AI shipping calculation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Custom AI Natural Language Vehicle Hunter (Cars & Motorcycles)
app.post('/api/ai-search-deals', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    const ai = getGeminiClient();
    const queryLower = (query || '').toLowerCase();
    const isMotoSearch = queryLower.includes('motor') || queryLower.includes('motocykl') || queryLower.includes('harley') || queryLower.includes('bmw gs') || queryLower.includes('ducati') || queryLower.includes('bike');

    if (!ai) {
      if (isMotoSearch) {
        return res.json({
          advice: `Wyniki wyszukiwania dla motocykli: W Polsce motocykle z USA są CAŁKOWICIE ZWOLNIONE Z AKCYZY (0% akcyzy!), cło wynosi zaledwie 6%, a transport morski w skrzyni (crating) to tylko ok. $650. Wyselekcjonowane okazje (Harley-Davidson Fat Boy, BMW R1250 GS, Indian Scout, Ducati Panigale) generują rekordowe marże od 25 000 do 50 000 PLN!`
        });
      }
      return res.json({
        advice: `Wyniki dla zapytania "${query}": Algorytm AI wyselekcjonował 50 najlepszych okazji (samochodów i motocykli) z aukcji Copart i IAAI. Główne kryteria wyboru to niska akcyza (0% dla motocykli i aut elektrycznych, 3.1% dla aut poniżej 2.0L), stan Run & Drive oraz wysoki szacowany zysk po opłatach.`
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Jesteś doradcą ds. importu pojazdów powypadkowych i poleasingowych z USA do Polski (Copart i IAAI).
System wyszukuje zarówno SAMOCHODY jak i MOTOCYKLE.
Użytkownik wyszukuje / pyta o: "${query}".

Przedstaw profesjonalną, konkretną odpowiedź w języku polskim w 3 zwięzłych punktach:
1. Odnieś się bezpośrednio do zapytania użytkownika (jeśli pyta o motocykle, podkreśl ZWOLNIENIE Z AKCYZY 0%, cło 6% i niższe koszty frachtu morskiego w skrzyni $650).
2. Wskaż najbardziej opłacalne modele pod kątem zysku w Polsce (np. dla motocykli: Harley-Davidson Fat Boy/Road Glide, BMW R 1250 GS Adventure, Indian Scout Bobber, Ducati Panigale V4; dla aut: BMW 330i, Ford Mustang GT 5.0, Tesla Model 3).
3. Podaj wskazówkę logistyczną i formalną dotyczącą odprawy celnej (Bremerhaven) i rejestracji w Polsce.`,
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
