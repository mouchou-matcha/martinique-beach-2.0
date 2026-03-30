/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Map } from './components/Map';
import { FilterBar, DataMode } from './components/FilterBar';
import { BeachCard } from './components/BeachCard';
import { SettingsModal } from './components/SettingsModal';
import { Beach, CrowdPrediction, predictCrowdLevelAsync, beaches } from './lib/data';
import { getHistoricalCrowdData } from './lib/historicalData';
import { getFlightVolume } from './lib/api';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dataMode, setDataMode] = useState<DataMode>('realtime');
  const [selectedBeach, setSelectedBeach] = useState<{ beach: Beach, prediction: CrowdPrediction } | null>(null);
  const [predictions, setPredictions] = useState<Record<string, CrowdPrediction>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [flightData, setFlightData] = useState<{ volume: number, isReal: boolean } | null>(null);

  // Update predictions for all beaches when the date or mode changes
  useEffect(() => {
    let isMounted = true;
    
    async function loadPredictions() {
      setIsLoading(true);
      
      const newPredictions: Record<string, CrowdPrediction> = {};
      
      if (dataMode === 'realtime') {
        // Fetch global flight data once per date change
        const fData = await getFlightVolume(selectedDate);
        
        // Fetch weather and compute predictions for all beaches
        await Promise.all(beaches.map(async (beach) => {
          newPredictions[beach.id] = await predictCrowdLevelAsync(beach, selectedDate, fData);
        }));
        
        if (isMounted) {
          setFlightData(fData);
        }
      } else {
        // Historical mode
        beaches.forEach(beach => {
          newPredictions[beach.id] = getHistoricalCrowdData(beach, selectedDate);
        });
        if (isMounted) {
          setFlightData(null);
        }
      }
      
      if (isMounted) {
        setPredictions(newPredictions);
        
        // Update the currently selected beach's prediction if one is open
        if (selectedBeach) {
          setSelectedBeach({
            beach: selectedBeach.beach,
            prediction: newPredictions[selectedBeach.beach.id]
          });
        }
        
        setIsLoading(false);
      }
    }

    loadPredictions();
    
    return () => {
      isMounted = false;
    };
  }, [selectedDate, dataMode]); // Re-run when selectedDate or dataMode changes

  const handleBeachSelect = (beach: Beach, prediction: CrowdPrediction) => {
    setSelectedBeach({ beach, prediction });
  };

  const handleCloseCard = () => {
    setSelectedBeach(null);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-100 font-sans">
      <FilterBar 
        selectedDate={selectedDate} 
        onDateChange={setSelectedDate} 
        onOpenSettings={() => setIsSettingsOpen(true)}
        dataMode={dataMode}
        onDataModeChange={setDataMode}
      />
      
      <main className="absolute inset-0 z-0">
        <Map 
          onBeachSelect={handleBeachSelect} 
          selectedBeachId={selectedBeach?.beach.id || null} 
          predictions={predictions}
          dataMode={dataMode}
        />
      </main>

      {isLoading && (
        <div className="absolute inset-0 z-30 bg-white/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white px-6 py-4 rounded-full shadow-xl flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-rose-600 animate-spin" />
            <span className="font-semibold text-gray-800">
              {dataMode === 'realtime' ? 'Analyse des données (Météo, Vols)...' : 'Chargement de l\'historique...'}
            </span>
          </div>
        </div>
      )}

      {selectedBeach && !isLoading && (
        <BeachCard 
          beach={selectedBeach.beach} 
          prediction={selectedBeach.prediction} 
          onClose={handleCloseCard} 
          dataMode={dataMode}
        />
      )}

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        flightData={flightData}
      />
    </div>
  );
}
