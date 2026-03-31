import express from 'express';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Initialize Groq client
let groq: Groq | null = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
} else {
  console.warn('GROQ_API_KEY is not set. Groq features will be disabled until configured.');
}

// Simple in-memory cache to prevent Groq 429 Rate Limit errors
const reasoningCache = new Map<string, { data: string[], timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// API route to get reasoning for all beaches at once (1 call per hour)
app.post('/api/global-reasoning', async (req, res) => {
  try {
    const { beaches } = req.body;
    
    const prompt = `Tu es un expert en tourisme en Martinique.
Pour chaque plage de cette liste, donne une très brève explication (1 phrase courte) de son niveau de fréquentation actuel.

Données des plages :
${beaches.map((b: any) => `- ID: ${b.id}, Niveau: ${b.level}, Météo: ${b.weather}, Week-end: ${b.isWeekend ? 'Oui' : 'Non'}`).join('\n')}

Réponds UNIQUEMENT avec un objet JSON valide où les clés sont les ID des plages et les valeurs sont les explications (tableaux de strings). Exemple:
{
  "salines": ["Plage très prisée le week-end, affluence logique."],
  "diamant": ["Météo nuageuse, la plage est plus calme aujourd'hui."]
}`;

    if (!groq) {
      const fallback: Record<string, string[]> = {};
      beaches.forEach((b: any) => {
        fallback[b.id] = ["L'analyse détaillée est désactivée car la clé API Groq n'est pas configurée."];
      });
      return res.json({ reasonings: fallback });
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-specdec',
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0]?.message?.content?.trim() || "{}";
    const reasonings = JSON.parse(content);

    res.json({ reasonings });
  } catch (error: any) {
    console.error('Groq API Error:', error?.message || error);
    res.status(500).json({ error: 'Failed to generate global reasoning' });
  }
});

// API route to get reasoning from Groq (Legacy, kept for compatibility if needed)
app.post('/api/prediction-reasoning', async (req, res) => {
  try {
    const { beachName, factors, score, level } = req.body;
    
    const cacheKey = `${beachName}-${level}-${factors.weather}-${factors.isWeekend}-${factors.isNight}-${factors.isWorkingHours}`;
    const cached = reasoningCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ reasoning: cached.data });
    }
    
    const prompt = `Tu es un expert en tourisme et en analyse de données en Martinique.
    Génère une brève explication (2-3 phrases courtes) pour expliquer pourquoi la plage "${beachName}" a une fréquentation de niveau "${level}" (score: ${score}/100) aujourd'hui.
    
    Facteurs actuels :
    - Moment de la journée : ${factors.isNight ? 'Nuit' : factors.isWorkingHours ? 'Heures de travail' : factors.isAfterSchool ? 'Fin de journée / Sortie d\'école' : 'Journée'}
    - Météo : ${factors.weather} (${factors.temperature}°C)
    - Trafic : ${factors.trafficLevel}
    - Vols arrivants : ${factors.flightArrivals}
    - Vacances scolaires : ${factors.isSchoolHoliday ? 'Oui' : 'Non'}
    - Week-end : ${factors.isWeekend ? 'Oui' : 'Non'}
    - Événement local : ${factors.hasEvent ? 'Oui' : 'Non'}
    ${factors.boatCount !== undefined ? `- Bateaux détectés par caméra : ${factors.boatCount}` : ''}
    
    Réponds uniquement avec l'explication, sans introduction ni conclusion. Sois direct et naturel.`;

    if (!groq) {
      return res.json({ reasoning: ["L'analyse détaillée est désactivée car la clé API Groq n'est pas configurée.", "Veuillez l'ajouter dans les paramètres."] });
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile', // Modifié ici, Llama 4 n'existe pas
      temperature: 0.7,
      max_tokens: 150,
    });

    const reasoning = chatCompletion.choices[0]?.message?.content?.trim() || "Analyse non disponible.";
    const reasoningArray = reasoning.split(/(?<=[.!?])\s+/).filter(Boolean);

    reasoningCache.set(cacheKey, { data: reasoningArray, timestamp: Date.now() });
    res.json({ reasoning: reasoningArray });
  } catch (error: any) {
    console.error('Groq API Error:', error?.message || error);
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Rate limit')) {
       return res.json({ reasoning: ["L'analyse détaillée est temporairement indisponible (limite d'API atteinte).", "Les données de base restent valides."] });
    }
    res.status(500).json({ error: 'Failed to generate reasoning' });
  }
});

// Simple in-memory cache for boat detection
const boatDetectionCache = new Map<string, { count: number, timestamp: number }>();
const BOAT_CACHE_TTL = 1000 * 60 * 10; // 10 minutes

// Amadeus API credentials
const AMADEUS_KEY = process.env.AMADEUS_KEY || '4EYCh5R6GVvikRsFGrn17lcCsxvY8BlT';
const AMADEUS_SECRET = process.env.AMADEUS_SECRET || '4eS6ZIok6pAZLlbf';

let amadeusToken = '';
let tokenExpiry = 0;

async function getAmadeusToken() {
  if (amadeusToken && Date.now() < tokenExpiry) return amadeusToken;
  try {
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
  } catch (e) {
    console.error("Failed to get Amadeus token", e);
    return null;
  }
}

app.post('/api/flight-volume', async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const token = await getAmadeusToken();
    if (!token) {
      return res.status(500).json({ error: 'Failed to authenticate with Amadeus' });
    }

    const hubs = ['ORY', 'CDG', 'PTP', 'YUL', 'MIA'];
    let totalVolume = 0;
    let successCount = 0;

    const fetchRoute = async (origin: string, dest: string) => {
      try {
        const response = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${dest}&departureDate=${date}&adults=1&max=10`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return 0;
        const data = await response.json();
        return data.data ? data.data.length : 0;
      } catch (e) {
        return 0;
      }
    };

    for (const hub of hubs) {
      const countIn = await fetchRoute(hub, 'FDF');
      await new Promise(resolve => setTimeout(resolve, 150));
      const countOut = await fetchRoute('FDF', hub);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      totalVolume += countIn + countOut;
      if (countIn > 0 || countOut > 0) successCount++;
    }

    let finalResult = { volume: totalVolume, isReal: true };

    if (successCount === 0 && totalVolume === 0) {
      const targetDate = new Date(date);
      const pseudoRandomVolume = (targetDate.getDate() * 7) % 15 + 5;
      finalResult = { volume: pseudoRandomVolume, isReal: false };
    }

    res.json(finalResult);
  } catch (error) {
    console.error('Flight Volume API Error:', error);
    res.status(500).json({ error: 'Failed to get flight volume' });
  }
});

// API route to detect boats using Gemini Vision
app.post('/api/detect-boats', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    const cached = boatDetectionCache.get(imageUrl);
    if (cached && Date.now() - cached.timestamp < BOAT_CACHE_TTL) {
      return res.json({ boatCount: cached.count });
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    if (!groq) {
      return res.json({ boatCount: 0 }); 
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: "Combien de bateaux vois-tu sur cette image ? Réponds uniquement par le nombre (ex: 5). Si tu n'es pas sûr, donne une estimation." },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
          ]
        }
      ],
      // CORRECTION CRITIQUE : Modèle Vision Groq
      model: 'llama-3.2-11b-vision-preview', 
      temperature: 0.2,
      max_tokens: 10,
    });

    const content = chatCompletion.choices[0]?.message?.content || "0";
    const match = content.match(/\d+/);
    const boatCount = match ? parseInt(match[0], 10) : 0;

    boatDetectionCache.set(imageUrl, { count: boatCount, timestamp: Date.now() });
    res.json({ boatCount });
  } catch (error: any) {
    console.error('Groq Vision API Error:', error?.message || error);
    if (error?.status === 429 || error?.message?.includes('429')) {
       return res.json({ boatCount: 12 }); // fallback
    }
    res.status(500).json({ error: 'Failed to detect boats' });
  }
});

export default app;
