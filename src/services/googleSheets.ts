import { CarAuction } from '../types';
import { calculateImportCosts, formatPln, formatUsd } from '../utils/calculator';
import { getDirectAuctionUrl } from '../utils/auctionLinks';
import { getAccessToken } from './firebaseAuth';

export interface ExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  rowsAdded: number;
}

export async function createOrUpdateCarSheet(
  cars: CarAuction[],
  existingSpreadsheetId?: string | null
): Promise<ExportResult> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Brak tokenu autoryzacji Google. Zaloguj się kontem Google.');
  }

  let spreadsheetId = existingSpreadsheetId;
  let isNew = false;

  // 1. Create spreadsheet if none exists
  if (!spreadsheetId) {
    isNew = true;
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: `AutoUSA AI - Najlepsze Oferty Aut z USA (${new Date().toLocaleDateString('pl-PL')})`,
        },
        sheets: [
          {
            properties: {
              title: 'Śledzone Aukcje',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(err.error?.message || 'Nie udało się utworzyć arkusza Google');
    }

    const createdData = await createRes.json();
    spreadsheetId = createdData.spreadsheetId;

    // Add styled header row
    const headers = [
      'Data zapisu',
      'Pojazd (Marka & Model)',
      'Rok',
      'VIN',
      'Portal Aukcyjny',
      'Numer Lot',
      'Cena Licytacji (USD)',
      'Koszt Dostawy pod Dom (PLN)',
      'Koszt Całkowity w PL (PLN)',
      'Wartość Rynkowa w PL (PLN)',
      'Szacowany Zysk (PLN)',
      'AI Score (1-100)',
      'Stan / Uszkodzenie',
      'Powiadomiono (+48 530 741 644)',
      'Bezpośredni Link do Aukcji'
    ];

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Śledzone Aukcje'!A1:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [headers],
      }),
    });
  }

  // 2. Prepare car rows
  const now = new Date().toLocaleString('pl-PL');
  const rows = cars.map((car) => {
    const calc = calculateImportCosts(car);
    return [
      now,
      `${car.vehicleType === 'motorcycle' ? '🏍️ Motocykl' : '🚗 Samochód'} - ${car.make} ${car.model} ${car.trim}`,
      car.year,
      car.vin,
      car.auctionPlatform,
      car.lotNumber,
      formatUsd(car.estimatedHammerUsd),
      formatPln(calc.totalShippingPln),
      formatPln(calc.totalLandedCostPln),
      formatPln(car.polishMarketValuePln),
      formatPln(calc.estimatedProfitPln),
      `${car.aiDealScore}/100`,
      `${car.driveCondition} - ${car.primaryDamage}`,
      'Aktywne (+48 530 741 644)',
      getDirectAuctionUrl(car)
    ];
  });

  // 3. Append rows
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Śledzone Aukcje'!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!appendRes.ok) {
    const err = await appendRes.json();
    throw new Error(err.error?.message || 'Błąd dopisywania danych do Google Sheets');
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    spreadsheetId: spreadsheetId!,
    spreadsheetUrl,
    rowsAdded: rows.length
  };
}
