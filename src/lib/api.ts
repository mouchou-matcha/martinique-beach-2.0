export interface WeatherData {
  condition: 'sunny' | 'cloudy' | 'rainy';
  temp: number;
  isReal: boolean;
}

export async function getWeatherForDate(lat: number, lng: number, date: Date): Promise<WeatherData | null> {
  // Fonction prête pour une future API Météo. Pour l'instant, retourne null pour utiliser la simulation.
  return null;
}

export async function getFlightVolume(date: Date): Promise<{ volume: number, isReal: boolean } | null> {
  try {
    const response = await fetch('/api/flight-volume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: date.toISOString().split('T')[0] })
    });
    
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Erreur API vols:", error);
    return null;
  }
}

export async function getGlobalReasoning(predictions: Record<string, any>, date: Date) {
  try {
    const beachesList = Object.keys(predictions).map(id => ({
      id,
      level: predictions[id].level,
      weather: predictions[id].factors.weather,
      isWeekend: predictions[id].factors.isWeekend
    }));

    const response = await fetch('/api/global-reasoning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beaches: beachesList })
    });

    if (!response.ok) return {};
    const data = await response.json();
    return data.reasonings || {};
  } catch (error) {
    console.error("Erreur API Groq:", error);
    return {};
  }
}
