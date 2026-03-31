import { format } from 'date-fns';

const OPENWEATHER_KEY = '96d66606760b395c80f6ba7cf6416d8d';

export interface WeatherData {
  temp: number;
  condition: 'sunny' | 'cloudy' | 'rainy';
  isReal: boolean;
}

export async function getWeatherForDate(lat: number, lng: number, targetDate: Date): Promise<WeatherData | null> {
  try {
    const dateStr = format(targetDate, 'yyyy-MM-dd-HH');
    const cacheKey = `weather_cache_${lat}_${lng}_${dateStr}`;
    
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // Ignore localStorage errors
    }

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

    const result: WeatherData = {
      temp: Math.round(closest.main.temp),
      condition,
      isReal: true
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (e) {
      // Ignore localStorage errors
    }

    return result;
  } catch (e) {
    console.error("OpenWeather API Error:", e);
    return null;
  }
}

export async function getFlightVolume(targetDate: Date): Promise<{ volume: number, isReal: boolean } | null> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (targetDate < today) {
      return null;
    }

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

    const res = await fetch('/api/flight-volume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr })
    });
    
    if (!res.ok) return null;
    
    const finalResult = await res.json();
    
    try {
      localStorage.setItem(cacheKey, JSON.stringify(finalResult));
    } catch (e) {
      // Ignore localStorage errors
    }

    return finalResult;
  } catch (e) {
    console.error("Flight Volume API Error:", e);
    return null;
  }
}

