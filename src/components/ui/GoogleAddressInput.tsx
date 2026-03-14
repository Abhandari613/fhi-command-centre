"use client";

import { useState, useEffect } from "react";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import Script from "next/script";
import { Loader2, MapPin } from "lucide-react";

const libraries: "places"[] = ["places"];

interface GoogleAddressInputProps {
  value?: string;
  onChange: (address: string) => void;
  onSelect?: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function GoogleAddressInput({
  value: controlledValue,
  onChange,
  onSelect,
  placeholder = "Search Address...",
  className,
  disabled = false,
}: GoogleAddressInputProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const {
    ready,
    value,
    suggestions: { status, data: suggestions },
    setValue: setAddressValue,
    clearSuggestions,
    init,
  } = usePlacesAutocomplete({
    requestOptions: {
      /* Define search scope here if needed */
    },
    debounce: 300,
    initOnMount: false,
  });

  // Initialize when script is loaded or already exists
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).google?.maps?.places) {
      init();
      setScriptLoaded(true);
    } else if (scriptLoaded) {
      init();
    }
  }, [scriptLoaded, init]);

  // Sync controlled value to internal state
  useEffect(() => {
    // Only update if differ to avoid loops, but allows external resets
    if (controlledValue !== undefined && controlledValue !== value) {
      setAddressValue(controlledValue, false);
    }
  }, [controlledValue, setAddressValue]);

  const handleSelect = async (address: string) => {
    setAddressValue(address, false);
    clearSuggestions();
    onChange(address);

    if (onSelect) {
      try {
        const results = await getGeocode({ address });
        const { lat, lng } = getLatLng(results[0]);
        onSelect(address, lat, lng);
      } catch (error) {
        console.error("Error fetching geocode:", error);
      }
    }
  };

  return (
    <div className="relative w-full">
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        onLoad={() => setScriptLoaded(true)}
        strategy="afterInteractive"
      />

      <div className="relative">
        <input
          value={value}
          onChange={(e) => {
            setAddressValue(e.target.value);
            onChange(e.target.value);
          }}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full bg-black/20 border border-white/10 rounded-lg p-3 pl-10 focus:outline-none focus:border-primary/50 text-sm placeholder:text-white/30 ${className || ""}`}
        />
        <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />

        {!ready && !suggestions.length && value.length > 2 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-white/30" />
          </div>
        )}
      </div>

      {status === "OK" && (
        <ul className="absolute z-50 w-full bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-lg mt-1 shadow-2xl max-h-60 overflow-auto">
          {suggestions.map(({ place_id, description }) => (
            <li
              key={place_id}
              onClick={() => handleSelect(description)}
              className="px-4 py-3 hover:bg-white/10 cursor-pointer text-sm text-gray-300 truncate transition-colors border-b border-white/5 last:border-none"
            >
              {description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
