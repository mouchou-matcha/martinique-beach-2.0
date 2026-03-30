import { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, ChevronDown, Clock, History, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

export type DataMode = 'realtime' | 'historical';

interface FilterBarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onOpenSettings: () => void;
  dataMode: DataMode;
  onDataModeChange: (mode: DataMode) => void;
}

export function FilterBar({ selectedDate, onDateChange, onOpenSettings, dataMode, onDataModeChange }: FilterBarProps) {
  const isAfter17h = selectedDate.getHours() >= 17;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="absolute top-0 left-0 right-0 z-40 p-4 pointer-events-none flex flex-col gap-2">
      <div className="max-w-md mx-auto pointer-events-auto w-full">
        <div className="bg-white rounded-full shadow-lg border border-gray-200 flex items-center px-4 py-3 gap-3 transition-transform hover:shadow-xl">
          <Search className="w-5 h-5 text-gray-800" strokeWidth={2.5} />
          
          <div className="flex-1 flex flex-col">
            <span className="text-xs text-gray-500 leading-tight mb-0.5">Où allez-vous ?</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 leading-tight">Martinique</span>
              <span className="text-gray-300 text-xs">•</span>
              
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  {isAfter17h ? 'Après 17h' : 'Maintenant'}
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isDropdownOpen && "rotate-180")} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 overflow-hidden">
                    <button
                      onClick={() => {
                        onDateChange(new Date());
                        setIsDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2", 
                        !isAfter17h ? "font-bold text-rose-600 bg-rose-50/50" : "text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      <Clock className="w-4 h-4" />
                      Maintenant
                    </button>
                    <button
                      onClick={() => {
                        const d = new Date();
                        d.setHours(17, 30, 0);
                        onDateChange(d);
                        setIsDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2", 
                        isAfter17h ? "font-bold text-rose-600 bg-rose-50/50" : "text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      <Clock className="w-4 h-4" />
                      Après 17h
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={onOpenSettings}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <SlidersHorizontal className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto pointer-events-auto w-full flex justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-full shadow-md border border-gray-200 p-1 flex items-center gap-1">
          <button
            onClick={() => onDataModeChange('realtime')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
              dataMode === 'realtime' 
                ? "bg-gray-900 text-white shadow-sm" 
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            Temps Réel
          </button>
          <button
            onClick={() => onDataModeChange('historical')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
              dataMode === 'historical' 
                ? "bg-gray-900 text-white shadow-sm" 
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <History className="w-3.5 h-3.5" />
            Historique
          </button>
        </div>
      </div>
    </div>
  );
}
