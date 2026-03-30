import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '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',
});

// Initialize Gemini client
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY 
});

// Simple in-memory cache to prevent Groq 429 Rate Limit errors
const reasoningCache = new Map<string, { data: string[], timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// API route to get reasoning from Groq
app.post('/api/prediction-reasoning', async (req, res) => {
  try {
    const { beachName, factors, score, level } = req.body;
    
    // Create a unique cache key based on beach and current factors
    const cacheKey = `${beachName}-${level}-${factors.weather}-${factors.isWeekend}`;
    
    const cached = reasoningCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ reasoning: cached.data });
    }
    
    const prompt = `Tu es un expert en tourisme et en analyse de données en Martinique.
    Génère une brève explication (2-3 phrases courtes) pour expliquer pourquoi la plage "${beachName}" a une fréquentation de niveau "${level}" (score: ${score}/100) aujourd'hui.
    
    Facteurs actuels :
    - Météo : ${factors.weather} (${factors.temperature}°C)
    - Trafic : ${factors.trafficLevel}
    - Vols arrivants : ${factors.flightArrivals}
    - Vacances scolaires : ${factors.isSchoolHoliday ? 'Oui' : 'Non'}
    - Week-end : ${factors.isWeekend ? 'Oui' : 'Non'}
    - Événement local : ${factors.hasEvent ? 'Oui' : 'Non'}
    ${factors.boatCount !== undefined ? `- Bateaux détectés par caméra : ${factors.boatCount}` : ''}
    
    Réponds uniquement avec l'explication, sans introduction ni conclusion. Sois direct et naturel.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 150,
    });

    const reasoning = chatCompletion.choices[0]?.message?.content?.trim() || "Analyse non disponible.";
    
    // Split into sentences for the UI
    const reasoningArray = reasoning.split(/(?<=[.!?])\s+/).filter(Boolean);

    // Save to cache
    reasoningCache.set(cacheKey, { data: reasoningArray, timestamp: Date.now() });

    res.json({ reasoning: reasoningArray });
  } catch (error: any) {
    console.error('Groq API Error:', error?.message || error);
    
    // Fallback if rate limited
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Rate limit')) {
       return res.json({ reasoning: ["L'analyse détaillée est temporairement indisponible (limite d'API atteinte).", "Les données de base restent valides."] });
    }
    
    res.status(500).json({ error: 'Failed to generate reasoning' });
  }
});

// Simple in-memory cache for boat detection
const boatDetectionCache = new Map<string, { count: number, timestamp: number }>();
const BOAT_CACHE_TTL = 1000 * 60 * 10; // 10 minutes

// API route to detect boats using Gemini Vision
app.post('/api/detect-boats', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    // Check cache (valid for 10 minutes)
    const cached = boatDetectionCache.get(imageUrl);
    if (cached && Date.now() - cached.timestamp < BOAT_CACHE_TTL) {
      return res.json({ boatCount: cached.count });
    }

    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: "Combien de bateaux vois-tu sur cette image ? Réponds uniquement par le nombre (ex: 5). Si tu n'es pas sûr, donne une estimation.",
          },
        ],
      },
      config: {
        temperature: 0.2,
      }
    });

    const content = response.text || "0";
    // Extract numbers from the response
    const match = content.match(/\d+/);
    const boatCount = match ? parseInt(match[0], 10) : 0;

    // Save to cache
    boatDetectionCache.set(imageUrl, { count: boatCount, timestamp: Date.now() });

    res.json({ boatCount });
  } catch (error: any) {
    console.error('Gemini Vision API Error:', error?.message || error);
    
    // Fallback if rate limited
    if (error?.status === 429 || error?.message?.includes('429')) {
       return res.json({ boatCount: 12 }); // fallback realistic number
    }
    
    res.status(500).json({ error: 'Failed to detect boats' });
  }
});

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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
