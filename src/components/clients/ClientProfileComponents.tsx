"use client";

import { LucideIcon } from "lucide-react";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import Script from "next/script";
import { useState, useEffect } from "react";

interface EditFieldProps {
  label: string;
  value: any;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: LucideIcon;
  type?: "text" | "textarea" | "select";
  options?: (string | { label: string; value: string })[];
  isEditing: boolean;
}

export const EditField = ({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  type = "text",
  options = [],
  isEditing,
}: EditFieldProps) => (
  <div className="space-y-1">
    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
      {Icon && <Icon className="w-3 h-3" />} {label}
    </label>
    {isEditing ? (
      type === "textarea" ? (
        <textarea
          className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500/50 min-h-[60px]"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : type === "select" ? (
        <select
          className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled className="bg-zinc-900 text-zinc-500">
            {placeholder || "Select..."}
          </option>
          {options.map((opt) => {
            const label = typeof opt === "string" ? opt : opt.label;
            const val = typeof opt === "string" ? opt : opt.value;
            return (
              <option key={val} value={val} className="bg-zinc-900 text-white">
                {label}
              </option>
            );
          })}
        </select>
      ) : (
        <input
          className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500/50"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )
    ) : (
      <div className="text-sm text-zinc-300 min-h-[24px] flex items-center">
        {value || <span className="text-zinc-600 italic text-xs">Empty</span>}
      </div>
    )}
  </div>
);

export const AddressEditField = ({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  isEditing,
}: EditFieldProps) => {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const {
    ready,
    value: inputValue,
    suggestions: { status, data: suggestions },
    setValue: setInputValue,
    clearSuggestions,
    init,
  } = usePlacesAutocomplete({
    requestOptions: {
      /* Define search scope here */
    },
    debounce: 300,
    initOnMount: false,
    defaultValue: value || "",
  });

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).google?.maps?.places) {
      init();
      setScriptLoaded(true);
    } else if (scriptLoaded) {
      init();
    }
  }, [scriptLoaded, init]);

  // Sync internal state with prop value when not editing or when value changes externally
  useEffect(() => {
    if (!isEditing || value !== inputValue) {
      setInputValue(value || "", false);
    }
  }, [value, isEditing, setInputValue]);

  const handleSelect = ({ description }: { description: string }) => {
    setInputValue(description, false);
    clearSuggestions();
    onChange(description);
  };

  return (
    <div className="space-y-1 relative">
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        onLoad={() => {
          console.log("📍 Google Maps Script Loaded");
          console.log(
            "📍 API Key present:",
            !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
          );
          setScriptLoaded(true);
        }}
        onError={(e) => console.error("📍 Google Maps Script Error:", e)}
        strategy="afterInteractive"
      />
      <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </label>
      {isEditing ? (
        <div className="relative">
          <input
            className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500/50"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              onChange(e.target.value);
            }}
            placeholder={placeholder}
          />
          {/* Debug info if not ready */}
          {!ready && scriptLoaded && (
            <div className="text-xs text-red-500 absolute right-0 top-0">
              Places API not ready
            </div>
          )}

          {status === "OK" && (
            <ul className="absolute z-[9999] w-full bg-zinc-900 border border-white/10 rounded shadow-xl mt-1 max-h-48 overflow-auto">
              {suggestions.map((suggestion) => (
                <li
                  key={suggestion.place_id}
                  onClick={() => handleSelect(suggestion)}
                  className="px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 cursor-pointer truncate"
                >
                  {suggestion.description}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="text-sm text-zinc-300 min-h-[24px] flex items-center">
          {value || <span className="text-zinc-600 italic text-xs">Empty</span>}
        </div>
      )}
    </div>
  );
};
