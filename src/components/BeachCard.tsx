import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, CloudSun, CloudRain, Sun, Car, Users, Camera, CalendarDays, CheckCircle2, History } from 'lucide-react';
import { Beach, CrowdPrediction } from '../lib/data';
import { DataMode } from './FilterBar';
import { cn } from '../lib/utils';

interface BeachCardProps {
  beach: Beach | null;
  prediction: CrowdPrediction | null;
  onClose: () => void;
  dataMode?: DataMode;
}

export function BeachCard({ beach, prediction, onClose, dataMode = 'realtime' }: BeachCardProps) {
  if (!beach || !prediction) return null;

  const getCrowdColor = (level: CrowdPrediction['level']) => {
    switch (level) {
      case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'very-high': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getCrowdLabel = (level: CrowdPrediction['level']) => {
    switch (level) {
      case 'low': return 'Calme';
      case 'medium': return 'Modéré';
      case 'high': return 'Très fréquenté';
      case 'very-high': return 'Saturé';
    }
  };

  const WeatherIcon = () => {
    switch (prediction.factors.weather) {
      case 'sunny': return <Sun className="w-5 h-5 text-amber-500" />;
      case 'cloudy': return <CloudSun className="w-5 h-5 text-gray-500" />;
      case 'rainy': return <CloudRain className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] max-h-[85vh] overflow-y-auto sm:max-w-md sm:left-4 sm:bottom-4 sm:rounded-2xl sm:max-h-[600px]"
      >
        <div className="sticky top-0 z-10 flex justify-center pt-3 pb-2 bg-white/80 backdrop-blur-md sm:hidden">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100 transition-colors shadow-sm border border-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pt-8 space-y-6">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{beach.name}</h2>
              <p className="text-gray-500 mt-1 flex items-center gap-1">
                <MapPin className="w-4 h-4" /> Martinique
              </p>
            </div>
            <div className={cn(
              "px-3 py-1.5 rounded-full font-bold text-sm border flex items-center gap-2 shrink-0",
              getCrowdColor(prediction.level)
            )}>
              <Users className="w-4 h-4" />
              {getCrowdLabel(prediction.level)}
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed">
            {beach.description}
          </p>

          {dataMode === 'historical' && (
            <div className="bg-purple-50 border border-purple-100 p-3 rounded-xl flex items-start gap-2">
              <History className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <p className="text-sm text-purple-800">
                Ces données sont basées sur l'historique de fréquentation pour cette période de l'année.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-2xl flex flex-col gap-2 relative overflow-hidden">
              {prediction.factors.apiSources.weather && (
                <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                  <CheckCircle2 className="w-3 h-3" /> API
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600 font-medium">
                <WeatherIcon />
                <span>Météo</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">
                {prediction.factors.temperature}°C
              </span>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl flex flex-col gap-2">
              <div className="flex items-center gap-2 text-gray-600 font-medium">
                <Car className="w-5 h-5" />
                <span>Trafic & Trajet</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-gray-900 capitalize leading-tight">
                  {prediction.factors.trafficLevel === 'low' ? 'Fluide' : prediction.factors.trafficLevel === 'medium' ? 'Modéré' : 'Dense'}
                </span>
                <span className="text-sm text-gray-500 mt-0.5">
                  ~{beach.travelTimeFromFDF} min depuis FDF
                </span>
              </div>
            </div>
          </div>

          {beach.hasCamera && dataMode === 'realtime' && (
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
              <Camera className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">IA Caméra Live</h4>
                <p className="text-sm text-blue-800 mt-1">
                  {prediction.factors.boatCount} bateaux détectés au mouillage actuellement.
                </p>
              </div>
            </div>
          )}
          
          <button className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-colors shadow-md">
            Voir l'itinéraire
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
