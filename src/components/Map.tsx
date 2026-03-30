import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { beaches, Beach, CrowdPrediction } from '../lib/data';
import { DataMode } from './FilterBar';
import { cn } from '../lib/utils';

// Fix Leaflet default icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  onBeachSelect: (beach: Beach, prediction: CrowdPrediction) => void;
  selectedBeachId: string | null;
  predictions: Record<string, CrowdPrediction>;
  dataMode?: DataMode;
}

// Custom hook to center map when a beach is selected
function MapController({ selectedBeachId }: { selectedBeachId: string | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedBeachId) {
      const beach = beaches.find(b => b.id === selectedBeachId);
      if (beach) {
        map.flyTo([beach.lat, beach.lng], 14, {
          duration: 1.5
        });
      }
    }
  }, [selectedBeachId, map]);

  return null;
}

export function Map({ onBeachSelect, selectedBeachId, predictions, dataMode = 'realtime' }: MapProps) {
  // Center of Martinique
  const center: [number, number] = [14.6415, -61.0242];

  const createCustomIcon = (prediction: CrowdPrediction, isSelected: boolean) => {
    const colors = {
      'low': 'bg-emerald-500',
      'medium': 'bg-amber-500',
      'high': 'bg-orange-500',
      'very-high': 'bg-red-600'
    };
    
    const colorClass = colors[prediction.level];
    const isHistorical = dataMode === 'historical';
    const borderClass = isHistorical ? 'border-purple-200' : 'border-white';
    const arrowBorderClass = isHistorical ? 'border-t-purple-200' : 'border-t-white';
    
    // Airbnb style marker (pill shape with text or just a dot)
    const html = `
      <div class="relative flex items-center justify-center transition-transform duration-300 ${isSelected ? 'scale-125 z-50' : 'scale-100 hover:scale-110'}">
        <div class="flex items-center justify-center px-3 py-1.5 rounded-full shadow-md border-2 ${borderClass} ${colorClass} text-white font-bold text-xs whitespace-nowrap gap-1">
          ${isHistorical ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>' : ''}
          ${prediction.score}%
        </div>
        <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent ${arrowBorderClass}"></div>
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent ${colorClass.replace('bg-', 'border-t-')}"></div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-leaflet-marker',
      iconSize: isHistorical ? [50, 40] : [40, 40],
      iconAnchor: isHistorical ? [25, 40] : [20, 40],
    });
  };

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={center} 
        zoom={11} 
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
      >
        {/* Minimalist map style (similar to Airbnb) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        <MapController selectedBeachId={selectedBeachId} />

        {beaches.map((beach) => {
          const prediction = predictions[beach.id];
          if (!prediction) return null; // Wait for prediction to load
          
          const isSelected = selectedBeachId === beach.id;
          
          return (
            <Marker 
              key={beach.id} 
              position={[beach.lat, beach.lng]}
              icon={createCustomIcon(prediction, isSelected)}
              eventHandlers={{
                click: () => onBeachSelect(beach, prediction),
              }}
            />
          );
        })}
      </MapContainer>
      
      {/* Custom CSS for the markers to ensure they overflow correctly */}
      <style>{`
        .custom-leaflet-marker {
          background: transparent;
          border: none;
        }
        .leaflet-container {
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}
