import { format } from 'date-fns';

const OPENWEATHER_KEY = '96d66606760b395c80f6ba7cf6416d8d';
const AMADEUS_KEY = '4EYCh5R6GVvikRsFGrn17lcCsxvY8BlT';
const AMADEUS_SECRET = '4eS6ZIok6pAZLlbf';

let amadeusToken = '';
let tokenExpiry = 0;

export interface WeatherData {
  temp: number;
  condition: 'sunny' | 'cloudy' | 'rainy';
  isReal: boolean;
}

export async function getWeatherForDate(lat: number, lng: number, targetDate: Date): Promise<WeatherData | null> {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_KEY}&units=metric`);
    const data = await res.json();
    
    if (!data.list) return null;
    
    const targetTime = targetDate.getTime();
    let closest = data.list[0];
    let minDiff = Math.abs(closest.dt * 1000 - targetTime);
    
    for (const item of data.list) {
      const diff = Math.abs(item.dt * 1000 - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = item;
      }
    }
    
    // If the closest forecast is more than 24h away (e.g., past dates or > 5 days future)
    if (minDiff > 24 * 60 * 60 * 1000) return null;
    
    const weatherMain = closest.weather[0].main.toLowerCase();
    let condition: 'sunny' | 'cloudy' | 'rainy' = 'cloudy';
    
    if (weatherMain.includes('rain') || weatherMain.includes('drizzle') || weatherMain.includes('thunderstorm')) {
      condition = 'rainy';
    } else if (weatherMain.includes('clear')) {
      condition = 'sunny';
    } else if (closest.clouds.all < 30) {
      condition = 'sunny';
    }

    return {
      temp: Math.round(closest.main.temp),
      condition,
      isReal: true
    };
  } catch (e) {
    console.error("OpenWeather API Error:", e);
    return null;
  }
}

async function getAmadeusToken() {
  if (amadeusToken && Date.now() < tokenExpiry) return amadeusToken;
  
  const res = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${AMADEUS_KEY}&client_secret=${AMADEUS_SECRET}`
  });
  
  const data = await res.json();
  if (data.access_token) {
    amadeusToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 5000;
  }
  return amadeusToken;
}

export async function getFlightVolume(targetDate: Date): Promise<{ volume: number, isReal: boolean } | null> {
  try {
    // Amadeus flight-offers API requires future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (targetDate < today) {
      return null; // Past date, API won't work
    }

    const token = await getAmadeusToken();
    if (!token) return null;

    const dateStr = format(targetDate, 'yyyy-MM-dd');
    
    // Cache logic: 1 call in the morning (AM), 1 call in the evening (PM) per date
    const isAM = new Date().getHours() < 12;
    const cacheKey = `amadeus_cache_${dateStr}_${isAM ? 'AM' : 'PM'}`;
    
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // Principaux hubs connectés à la Martinique (Paris Orly, Paris CDG, Pointe-à-Pitre, Montréal, Miami)
    const hubs = ['ORY', 'CDG', 'PTP', 'YUL', 'MIA'];
    let totalVolume = 0;
    let successCount = 0;

    // Fonction pour récupérer les vols sur une route spécifique
    const fetchRoute = async (origin: string, dest: string) => {
      try {
        const res = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${dest}&departureDate=${dateStr}&adults=1&max=10`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return 0;
        const data = await res.json();
        return data.data ? data.data.length : 0;
      } catch (e) {
        return 0;
      }
    };

    // Lancer toutes les requêtes en parallèle (Entrants et Sortants)
    const promises: Promise<number>[] = [];
    for (const hub of hubs) {
      promises.push(fetchRoute(hub, 'FDF')); // Vols entrants vers la Martinique
      promises.push(fetchRoute('FDF', hub)); // Vols sortants depuis la Martinique
    }

    const results = await Promise.all(promises);
    
    for (const count of results) {
      totalVolume += count;
      if (count > 0) successCount++;
    }
    
    let finalResult = { volume: totalVolume, isReal: true };

    // Si l'API a répondu mais n'a trouvé aucun vol sur aucun hub, on renvoie quand même le résultat
    if (successCount === 0 && totalVolume === 0 && results.length > 0) {
      // On simule un volume de base si l'API de test ne renvoie rien pour éviter un bug visuel
      // On utilise une valeur fixe basée sur la date pour éviter que ça change à chaque clic
      const pseudoRandomVolume = (targetDate.getDate() * 7) % 15 + 5;
      finalResult = { volume: pseudoRandomVolume, isReal: false };
    }
    
    try {
      localStorage.setItem(cacheKey, JSON.stringify(finalResult));
    } catch (e) {
      // Ignore localStorage errors
    }

    return finalResult;
  } catch (e) {
    console.error("Amadeus API Error:", e);
    return null;
  }
}
