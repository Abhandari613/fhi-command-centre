'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createLocationAction, getClientLocationsAction } from '@/app/actions/location-actions';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Database } from '@/types/supabase';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import Script from 'next/script';
import useSWR from 'swr';

type Location = Database['public']['Tables']['client_locations']['Row'] & {
    lat?: number | null;
    lng?: number | null;
};

interface LocationPickerProps {
    clientId: string;
    onSelect: (locationId: string | null, address: string) => void;
    selectedLocationId: string | null;
    defaultAddress?: string | null;
}

const locationSchema = z.object({
    name: z.string().min(1, "Name is required (e.g., 'Home', 'Rental')"),
    address: z.string().min(5, "Address is required"),
    lat: z.number().optional().nullable(),
    lng: z.number().optional().nullable(),
});

type LocationFormValues = z.infer<typeof locationSchema>;

const libraries: ("places")[] = ["places"];

export function LocationPicker({ clientId, onSelect, selectedLocationId, defaultAddress }: LocationPickerProps) {
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [scriptLoaded, setScriptLoaded] = useState(false);

    const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<LocationFormValues>({
        resolver: zodResolver(locationSchema)
    });

    const {
        ready,
        value,
        suggestions: { status, data: suggestions },
        setValue: setAddressValue,
        clearSuggestions,
        init,
    } = usePlacesAutocomplete({
        requestOptions: {
            /* Define search scope here */
        },
        debounce: 300,
        initOnMount: false,
    });

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
            init();
            setScriptLoaded(true);
        } else if (scriptLoaded) {
            init();
        }
    }, [scriptLoaded, init]);

    useEffect(() => {
        if (!clientId) {
            setLocations([]);
            return;
        }
        fetchLocations();
    }, [clientId, defaultAddress]);

    const fetchLocations = async () => {
        setLoading(true);
        const result = await getClientLocationsAction(clientId);
        if (result.success && result.data) {
            setLocations(result.data);

            // Auto-select logic
            if (!selectedLocationId) {
                // If there are saved locations, pick primary
                const primary = result.data.find(l => l.is_primary);
                if (primary) {
                    onSelect(primary.id, primary.address);
                } else if (result.data.length > 0) {
                    onSelect(result.data[0].id, result.data[0].address);
                } else if (defaultAddress) {
                    // Fallback to default address if no saved locations
                    onSelect(null, defaultAddress);
                }
            }
        } else if (defaultAddress && !selectedLocationId) {
            onSelect(null, defaultAddress);
        }
        setLoading(false);
    };

    const handleAddressSelect = async (address: string) => {
        setAddressValue(address, false);
        clearSuggestions();
        setValue('address', address);

        try {
            const results = await getGeocode({ address });
            const { lat, lng } = getLatLng(results[0]);
            setValue('lat', lat);
            setValue('lng', lng);
        } catch (error) {
            console.error("Error: ", error);
        }
    };

    const onSubmit = async (data: LocationFormValues) => {
        const result = await createLocationAction({
            client_id: clientId,
            ...data,
            is_primary: locations.length === 0
        });

        if (result.success && result.data) {
            const newLoc = result.data as any;
            setLocations(prev => [newLoc, ...prev]);
            onSelect(result.data.id, result.data.address);
            setIsCreating(false);
            reset();
            setAddressValue("");
        } else {
            alert(result.error || 'Failed to create location');
        }
    };

    if (!clientId) return null;

    if (loading) return <div className="flex items-center gap-2 text-white/50 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading locations...</div>;

    return (
        <div className="space-y-3">
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
                onLoad={() => setScriptLoaded(true)}
                strategy="afterInteractive"
            />

            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-400" />
                    Property Location
                </label>
                {!isCreating && (
                    <button
                        type="button"
                        onClick={() => setIsCreating(true)}
                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                    >
                        <Plus className="w-3 h-3" />
                        Add New
                    </button>
                )}
            </div>

            {isCreating ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <input
                            {...register('name')}
                            placeholder="Label (e.g. Main House)"
                            className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-purple-500/50 outline-none placeholder:text-gray-500"
                        />
                        {errors.name && <span className="text-xs text-red-400">{errors.name.message}</span>}
                    </div>

                    <div className="space-y-2 relative">
                        <input
                            value={value}
                            onChange={(e) => {
                                setAddressValue(e.target.value);
                                setValue('address', e.target.value); // Sync with form
                            }}
                            placeholder="Search Address..."
                            className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-purple-500/50 outline-none placeholder:text-gray-500"
                        />
                        {status === "OK" && (
                            <ul className="absolute z-50 w-full bg-gray-900 border border-white/10 rounded-lg mt-1 shadow-xl max-h-60 overflow-auto">
                                {suggestions.map(({ place_id, description }) => (
                                    <li
                                        key={place_id}
                                        onClick={() => handleAddressSelect(description)}
                                        className="px-3 py-2 hover:bg-white/10 cursor-pointer text-sm text-gray-300 truncate"
                                    >
                                        {description}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {errors.address && <span className="text-xs text-red-400">{errors.address.message}</span>}
                    </div>

                    {/* Map Preview */}
                    {watch('lat') && watch('lng') && (
                        <div className="rounded-lg overflow-hidden border border-white/10 h-32 w-full relative">
                            <img
                                src={`https://maps.googleapis.com/maps/api/staticmap?center=${watch('lat')},${watch('lng')}&zoom=15&size=400x200&maptype=roadmap&markers=color:red%7C${watch('lat')},${watch('lng')}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                                alt="Location Preview"
                                className="w-full h-full object-cover opacity-80"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => {
                                setIsCreating(false);
                                setAddressValue("");
                            }}
                            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <AnimatedButton
                            variant="primary"
                            onClick={handleSubmit(onSubmit)}
                            disabled={isSubmitting}
                            className="px-3 py-1.5 h-auto text-xs"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Location'}
                        </AnimatedButton>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-2">
                    {defaultAddress && (
                        <div
                            onClick={() => onSelect(null, defaultAddress)}
                            className={`
                                cursor-pointer group flex items-start gap-3 p-3 rounded-lg border transition-all duration-200
                                ${selectedLocationId === null
                                    ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}
                            `}
                        >
                            <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${selectedLocationId === null ? 'border-purple-400' : 'border-white/30'}`}>
                                {selectedLocationId === null && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                            </div>
                            <div>
                                <h4 className={`text-sm font-medium ${selectedLocationId === null ? 'text-purple-300' : 'text-gray-200'}`}>
                                    Client Default <span className="text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded ml-2">Profile</span>
                                </h4>
                                <p className="text-xs text-white/50 group-hover:text-white/70 transition-colors mt-0.5">{defaultAddress}</p>
                            </div>
                        </div>
                    )}
                    {locations.map(loc => (
                        <div
                            key={loc.id}
                            onClick={() => onSelect(loc.id, loc.address)}
                            className={`
                                cursor-pointer group flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 overflow-hidden relative
                                ${selectedLocationId === loc.id
                                    ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}
                            `}
                        >
                            {/* Mini Map background for selected item */}
                            {selectedLocationId === loc.id && loc.lat && loc.lng && (
                                <div className="absolute inset-0 opacity-10 pointer-events-none grayscale">
                                    <img
                                        src={`https://maps.googleapis.com/maps/api/staticmap?center=${loc.lat},${loc.lng}&zoom=15&size=400x100&maptype=roadmap&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}

                            <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center relative z-10 ${selectedLocationId === loc.id ? 'border-purple-400' : 'border-white/30'
                                }`}>
                                {selectedLocationId === loc.id && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                            </div>
                            <div className="relative z-10">
                                <h4 className={`text-sm font-medium ${selectedLocationId === loc.id ? 'text-purple-300' : 'text-gray-200'}`}>
                                    {loc.name} {loc.is_primary && <span className="text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded ml-2">Primary</span>}
                                </h4>
                                <p className="text-xs text-white/50 group-hover:text-white/70 transition-colors mt-0.5">{loc.address}</p>
                            </div>
                        </div>
                    ))}
                    {locations.length === 0 && (
                        <div className="text-center py-4 bg-white/5 rounded-lg border border-dashed border-white/10 text-white/30 text-xs">
                            No locations found. Add one above.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
