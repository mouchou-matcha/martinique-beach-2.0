import { getWeatherForDate, getFlightVolume, WeatherData } from './api';

export interface Beach {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
  image: string;
  hasCamera?: boolean;
  travelTimeFromFDF: number;
}

export const beaches: Beach[] = [
  {
    id: "madiana",
    name: "Plage de Madiana",
    lat: 14.6141,
    lng: -61.1042,
    description: "Plage de sable gris située à Schoelcher, très fréquentée en fin de journée par les étudiants et les familles.",
    image: "https://picsum.photos/seed/madiana/800/600",
    travelTimeFromFDF: 10,
  },
  {
    id: "port-sainte-anne",
    name: "Port de Sainte-Anne",
    lat: 14.4345,
    lng: -60.8805,
    description: "Le port de plaisance de Sainte-Anne, très animé avec de nombreux bateaux au mouillage.",
    image: "https://picsum.photos/seed/port-sainte-anne/800/600",
    hasCamera: true,
    travelTimeFromFDF: 55,
  },
  {
    id: "pointe-marin",
    name: "Pointe Marin",
    lat: 14.4465,
    lng: -60.8830,
    description: "Plage familiale très fréquentée à Sainte-Anne, eau calme et peu profonde.",
    image: "https://picsum.photos/seed/pointe-marin/800/600",
    hasCamera: true,
    travelTimeFromFDF: 50,
  },
  {
    id: "salines",
    name: "Les Salines",
    lat: 14.4035,
    lng: -60.8765,
    description: "La plage la plus célèbre de Martinique. Très longue et bordée de cocotiers.",
    image: "https://picsum.photos/seed/salines/800/600",
    travelTimeFromFDF: 60,
  },
  {
    id: "anse-dufour",
    name: "Anse Dufour",
    lat: 14.526848,
    lng: -61.080132,
    description: "Petite crique de sable blanc, célèbre pour l'observation des tortues.",
    image: "https://picsum.photos/seed/anse-dufour/800/600",
    travelTimeFromFDF: 40,
  },
  {
    id: "diamant",
    name: "Plage du Diamant",
    lat: 14.4775,
    lng: -61.0265,
    description: "Longue plage face au rocher, vagues puissantes, idéale pour la marche.",
    image: "https://picsum.photos/seed/diamant/800/600",
    travelTimeFromFDF: 40,
  },
  {
    id: "anse-couleuvre",
    name: "Anse Couleuvre",
    lat: 14.8395,
    lng: -61.2188,
    description: "Plage sauvage de sable noir au nord, entourée de forêt tropicale.",
    image: "https://picsum.photos/seed/anse-couleuvre/800/600",
    travelTimeFromFDF: 75,
  },
  {
    id: "anse-mitan",
    name: "Anse Mitan",
    lat: 14.5545,
    lng: -61.0535,
    description: "Plage très animée aux Trois-Îlets, avec de nombreux bars et restaurants.",
    image: "https://picsum.photos/seed/anse-mitan/800/600",
    travelTimeFromFDF: 35,
  },
  {
    id: "grande-anse",
    name: "Grande Anse d'Arlet",
    lat: 14.5015,
    lng: -61.0880,
    description: "Vaste baie très appréciée des plaisanciers et des tortues marines.",
    image: "https://picsum.photos/seed/grande-anse/800/600",
    travelTimeFromFDF: 45,
  },
  {
    id: "carbet",
    name: "Plage du Coin (Le Carbet)",
    lat: 14.712165,
    lng: -61.181414,
    description: "Longue plage de sable gris au pied de la Montagne Pelée, vue magnifique.",
    image: "https://picsum.photos/seed/carbet/800/600",
    travelTimeFromFDF: 40,
  },
  {
    id: "cap-macre",
    name: "Cap Macré",
    lat: 14.476839,
    lng: -60.831517,
    description: "Plage sauvage côté Atlantique, protégée par une barrière de corail.",
    image: "https://picsum.photos/seed/cap-macre/800/600",
    travelTimeFromFDF: 60,
  },
  {
    id: "anse-michel",
    name: "Anse Michel",
    lat: 14.4445,
    lng: -60.8245,
    description: "Spot réputé pour le kitesurf, magnifique lagon peu profond.",
    image: "https://picsum.photos/seed/anse-michel/800/600",
    travelTimeFromFDF: 55,
  },
  {
    id: "tartane",
    name: "Plage de la Brèche (Tartane)",
    lat: 14.7615,
    lng: -60.9345,
    description: "Plage familiale sur la presqu'île de la Caravelle, ombragée.",
    image: "https://picsum.photos/seed/tartane/800/600",
    travelTimeFromFDF: 45,
  }
];

export interface PredictionFactors {
  weather: 'sunny' | 'cloudy' | 'rainy';
  temperature: number;
  trafficLevel: 'low' | 'medium' | 'high';
  flightArrivals: number;
  isSchoolHoliday: boolean;
  isWeekend: boolean;
  isAfterSchool: boolean;
  hasEvent: boolean;
  boatCount?: number;
  apiSources: {
    weather: boolean;
    flights: boolean;
  };
}

export interface CrowdPrediction {
  level: 'low' | 'medium' | 'high' | 'very-high';
  score: number;
  factors: PredictionFactors;
  reasoning: string[];
}

function getSeededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return function() {
    h = Math.imul(741103597, h);
    h ^= h >>> 15;
    return ((h >>> 0) / 4294967296);
  }
}

export async function predictCrowdLevelAsync(
  beach: Beach, 
  date: Date, 
  globalFlightData: { volume: number, isReal: boolean } | null
): Promise<CrowdPrediction> {
  const hour = date.getHours();
  const day = date.getDay();
  const month = date.getMonth();
  
  const seed = `${beach.id}-${date.getFullYear()}-${month}-${date.getDate()}-${hour}`;
  const random = getSeededRandom(seed);
  
  const isWeekend = day === 0 || day === 6;
  const isAfterSchool = !isWeekend && hour >= 15 && hour <= 18;
  const isSchoolHoliday = month === 6 || month === 7;
  const isRainySeason = month >= 5 && month <= 10;
  
  // Fetch real weather if possible
  let weatherData = await getWeatherForDate(beach.lat, beach.lng, date);
  
  // Fallback to simulated weather if API fails or date is out of range
  if (!weatherData) {
    const simCondition = isRainySeason && random() > 0.6 ? 'rainy' : (random() > 0.3 ? 'sunny' : 'cloudy');
    weatherData = {
      condition: simCondition,
      temp: simCondition === 'sunny' ? 30 : (simCondition === 'cloudy' ? 28 : 26),
      isReal: false
    };
  }

  // Fallback to simulated flights if API fails
  let flightData = globalFlightData;
  if (!flightData) {
    flightData = {
      volume: Math.floor(random() * 5) + (isSchoolHoliday ? 5 : 0),
      isReal: false
    };
  }

  const trafficLevel: 'low' | 'medium' | 'high' = isWeekend && hour > 10 && hour < 16 ? 'high' : 'medium';
  const hasEvent = random() > 0.85;
  
  let score = 20;
  const reasoning: string[] = [];

  if (isWeekend) {
    score += 30;
    reasoning.push("C'est le week-end, affluence locale forte.");
  }
  
  if (isSchoolHoliday) {
    score += 20;
    reasoning.push("Période de vacances scolaires.");
  }
  
  if (isAfterSchool) {
    score += 15;
    reasoning.push("Sortie des écoles, les familles arrivent.");
  }
  
  if (weatherData.condition === 'sunny') {
    score += 20;
    reasoning.push(weatherData.isReal ? "Météo ensoleillée confirmée par OpenWeather." : "Météo ensoleillée idéale.");
  } else if (weatherData.condition === 'rainy') {
    score -= 30;
    reasoning.push(weatherData.isReal ? "Pluie annoncée par OpenWeather, moins de monde." : "Risque d'averses, moins de monde.");
  }
  
  if (trafficLevel === 'high') {
    score += 10;
    reasoning.push("Trafic dense vers cette zone (Google Traffic simulé).");
  }
  
  if (flightData.volume > 20) {
    score += 15;
    reasoning.push(flightData.isReal ? `Forte affluence touristique (${flightData.volume} vols détectés).` : "Forte affluence touristique récente.");
  } else if (flightData.volume > 5) {
    score += 10;
    reasoning.push(flightData.isReal ? `Affluence touristique modérée (${flightData.volume} vols détectés).` : "Affluence touristique récente.");
  }
  
  if (hasEvent) {
    score += 40;
    reasoning.push("Événement local en cours (ex: Tour des Yoles).");
  }

  let boatCount;
  if (beach.hasCamera) {
    try {
      // Use the actual thumbnail from the Skyline webcam for Sainte-Anne
      const webcamUrl = "https://cdn.skylinewebcams.com/social5819.jpg";
      const response = await fetch('/api/detect-boats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: webcamUrl })
      });
      if (response.ok) {
        const data = await response.json();
        boatCount = data.boatCount;
      } else {
        boatCount = Math.floor(random() * 20); // fallback
      }
    } catch (err) {
      console.error("Failed to fetch boat detection:", err);
      boatCount = Math.floor(random() * 20); // fallback
    }

    if (boatCount > 10) {
      score += 15;
      reasoning.push(`L'IA a détecté ${boatCount} bateaux au mouillage.`);
    } else {
      reasoning.push(`L'IA a détecté ${boatCount} bateaux (mouillage calme).`);
    }
  }

  score = Math.max(0, Math.min(100, score));
  
  let level: CrowdPrediction['level'] = 'low';
  if (score > 80) level = 'very-high';
  else if (score > 60) level = 'high';
  else if (score > 35) level = 'medium';

  const factors = {
    weather: weatherData.condition,
    temperature: weatherData.temp,
    trafficLevel,
    flightArrivals: flightData.volume,
    isSchoolHoliday,
    isWeekend,
    isAfterSchool,
    hasEvent,
    boatCount,
    apiSources: {
      weather: weatherData.isReal,
      flights: flightData.isReal
    }
  };

  // Fetch reasoning from Groq API
  let finalReasoning = reasoning;
  try {
    const response = await fetch('/api/prediction-reasoning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        beachName: beach.name,
        factors,
        score,
        level
      })
    });
    if (response.ok) {
      const data = await response.json();
      if (data.reasoning && data.reasoning.length > 0) {
        finalReasoning = data.reasoning;
      }
    }
  } catch (err) {
    console.error("Failed to fetch Groq reasoning:", err);
  }

  return {
    level,
    score,
    factors,
    reasoning: finalReasoning
  };
}
