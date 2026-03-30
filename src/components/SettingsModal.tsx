import { motion, AnimatePresence } from 'motion/react';
import { X, Plane, CheckCircle2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  flightData: { volume: number, isReal: boolean } | null;
}

export function SettingsModal({ isOpen, onClose, flightData }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden z-10"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Paramètres & Données</h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Trafic Aérien (Amadeus)</h3>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 relative">
                {flightData?.isReal && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" /> API Active
                  </div>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Plane className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {flightData ? flightData.volume : '...'}
                    </div>
                    <div className="text-sm text-gray-500">vols entrants/sortants détectés</div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Données agrégées depuis les hubs ORY, CDG, PTP, YUL, MIA vers FDF. Utilisé pour pondérer l'affluence touristique globale.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
