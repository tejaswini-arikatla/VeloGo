import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2, Crosshair } from 'lucide-react';
import { api } from '../services/api';
import { GeoSearchResult } from '../types';

interface AddressAutocompleteProps {
  label: string;
  placeholder?: string;
  value: string;
  onAddressChange: (address: string) => void;
  onSelectLocation: (loc: { address: string; lat: number; lng: number }) => void;
  userLat?: number;
  userLng?: number;
  pinButton?: React.ReactNode;
  locateButton?: React.ReactNode;
  onUseCurrentLocation?: () => void;
  isLocating?: boolean;
  markerColor?: string;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  label,
  placeholder = 'Search place, street, or landmark...',
  value,
  onAddressChange,
  onSelectLocation,
  userLat,
  userLng,
  pinButton,
  locateButton,
  onUseCurrentLocation,
  isLocating = false,
  markerColor = 'bg-emerald-500',
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<GeoSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Sync internal query when external value updates (e.g. from GPS or map click)
  useEffect(() => {
    setQuery(value);
    setIsOpen(false);
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (text: string) => {
    setQuery(text);
    onAddressChange(text);
    setSelectedIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (text.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await api.geo.search(text.trim());
        setSuggestions(results || []);
      } catch (err) {
        console.warn('Geocoding search error:', err);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleSelect = (item: GeoSearchResult) => {
    setQuery(item.displayName);
    onSelectLocation({
      address: item.displayName,
      lat: item.latitude,
      lng: item.longitude,
    });
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter' && query.trim().length >= 2) {
        e.preventDefault();
        api.geo.search(query.trim()).then((res) => {
          if (res && res.length > 0) {
            handleSelect(res[0]);
          }
        });
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = selectedIndex >= 0 ? suggestions[selectedIndex] : suggestions[0];
      if (chosen) {
        handleSelect(chosen);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    onAddressChange('');
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${markerColor}`} />
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          {locateButton ? (
            locateButton
          ) : onUseCurrentLocation ? (
            <button
              type="button"
              onClick={onUseCurrentLocation}
              disabled={isLocating}
              className="text-[11px] font-bold px-2 py-0.5 rounded-md transition-all flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 active:scale-95 disabled:opacity-50"
              title="Use my current GPS position for pickup"
            >
              {isLocating ? (
                <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
              ) : (
                <Crosshair className="w-3 h-3 text-emerald-600" />
              )}
              <span>Current location</span>
            </button>
          ) : null}
          {pinButton}
        </div>
      </div>

      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full text-xs font-semibold pl-9 pr-9 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all shadow-sm"
        />

        <div className="absolute right-3 flex items-center gap-1">
          {isLoading && <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />}
          {query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
          {/* Top Option: Use Current Location (GPS) */}
          {onUseCurrentLocation && (
            <button
              type="button"
              onClick={() => {
                onUseCurrentLocation();
                setIsOpen(false);
              }}
              disabled={isLocating}
              className="w-full text-left p-3 bg-emerald-50/80 hover:bg-emerald-100/90 transition-colors flex items-center gap-3 border-b border-emerald-100 group"
            >
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                {isLocating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Crosshair className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                  <span>Use Current Location</span>
                  <span className="text-[9px] font-black bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                    GPS
                  </span>
                </p>
                <p className="text-[11px] text-emerald-700 truncate leading-snug">
                  {isLocating
                    ? 'Acquiring GPS position...'
                    : 'Set your live position as the pickup point'}
                </p>
              </div>
            </button>
          )}
          {suggestions.length > 0 ? (
            suggestions.map((item, idx) => (
              <button
                key={item.placeId || idx}
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full text-left p-3 hover:bg-amber-50/70 transition-colors flex items-start gap-3 ${
                  selectedIndex === idx ? 'bg-amber-50' : ''
                }`}
              >
                <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 truncate">{item.name}</p>
                  <p className="text-[11px] text-slate-500 truncate leading-snug">{item.displayName}</p>
                </div>
              </button>
            ))
          ) : !isLoading && query.trim().length >= 2 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No matching locations found. Try a different landmark or area name.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
