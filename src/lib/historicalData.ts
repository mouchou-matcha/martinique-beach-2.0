import { Beach, CrowdPrediction } from './data';

// Predefined historical dataset
// We'll use a deterministic function to generate historical data based on the beach and month/day/hour to simulate a real dataset.
export function getHistoricalCrowdData(beach: Beach, date: Date): CrowdPrediction {
  const month = date.getMonth();
  const day = date.getDay();
  const hour = date.getHours();
  
  // Base score based on beach popularity (using id length as a simple hash)
  let baseScore = 30 + (beach.id.length % 5) * 5;
  
  // Weekend modifier
  if (day === 0 || day === 6) {
    baseScore += 25;
  }
  
  // Time of day modifier
  if (hour >= 10 && hour <= 15) {
    baseScore += 20; // Peak hours
  } else if (hour >= 16 && hour <= 18) {
    baseScore += 10; // Late afternoon
  } else if (hour < 8 || hour > 19) {
    baseScore -= 20; // Early morning or night
  }
  
  // Seasonality (High season: Dec-April)
  if (month === 11 || month <= 3) {
    baseScore += 15;
  }
  
  // Ensure score is within 0-100
  const score = Math.max(0, Math.min(100, baseScore));
  
  let level: CrowdPrediction['level'] = 'low';
  if (score > 80) level = 'very-high';
  else if (score > 60) level = 'high';
  else if (score > 35) level = 'medium';

  return {
    level,
    score,
    factors: {
      weather: 'sunny', // Historical average
      temperature: 28, // Historical average
      trafficLevel: score > 60 ? 'high' : score > 35 ? 'medium' : 'low',
      flightArrivals: 0,
      isSchoolHoliday: month === 6 || month === 7,
      isWeekend: day === 0 || day === 6,
      isAfterSchool: (! (day === 0 || day === 6)) && hour >= 15 && hour <= 18,
      hasEvent: false,
      apiSources: {
        weather: false,
        flights: false
      }
    },
    reasoning: [
      "Basé sur les données historiques de fréquentation pour ce mois et ce jour de la semaine.",
      score > 60 ? "Historiquement très fréquenté à cette période." : "Historiquement calme à cette période."
    ]
  };
}
