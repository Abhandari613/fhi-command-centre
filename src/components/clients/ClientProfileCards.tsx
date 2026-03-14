"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import {
    User, Phone, Mail, MapPin, Calendar, Briefcase,
    Wifi, Key, Car, Dog, Coffee, MessageSquare,
    Edit2, Save, X, Copy, Flag, Home, Heart,
    AlertTriangle, Tag, Clock, DollarSign, Layers, Users,
    Telescope, Plus, Trash2
} from "lucide-react";
import { EditField, AddressEditField } from "./ClientProfileComponents";

// Types
export type ViewMode = 'admin' | 'client';

interface BaseCardProps {
    formData: any;
    updateNested: (category: string, field: string, value: any) => void;
    isEditing: boolean;
    mode?: ViewMode;
}

// ------------------------------------------------------------------
// 1. PROPERTY INTEL CARD
// ------------------------------------------------------------------
export const PropertyIntelCard = ({ formData, updateNested, isEditing, mode = 'admin' }: BaseCardProps) => {

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copied!");
    };

    return (
        <GlassCard className="p-6 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-blue-300 border-b border-white/10 pb-2">
                <Home className="w-5 h-5" /> {mode === 'client' ? "Your Home" : "Property Intel"}
            </h2>
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1 mb-1">
                        <Key className="w-3 h-3" /> Gate / Access Code
                    </label>
                    {isEditing ? (
                        <input
                            className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white"
                            value={formData.property_details.access_instructions || ""}
                            onChange={e => updateNested('property_details', 'access_instructions', e.target.value)}
                            placeholder="e.g. 1234 or Key under mat"
                        />
                    ) : (
                        <div className="bg-blue-500/10 text-blue-300 font-mono text-lg px-3 py-2 rounded border border-blue-500/20 flex justify-between items-center group">
                            {formData.property_details?.access_instructions || "---"}
                            {formData.property_details?.access_instructions && (
                                <Copy onClick={() => handleCopy(formData.property_details.access_instructions)} className="w-4 h-4 cursor-pointer opacity-50 group-hover:opacity-100" />
                            )}
                        </div>
                    )}
                </div>

                {/* Wifi - Internal or Client? Client might want to share it. */}
                <EditField label="Wifi Network" icon={Wifi} value={formData.property_details.wifi_network} onChange={(v: string) => updateNested('property_details', 'wifi_network', v)} isEditing={isEditing} />
                <EditField label="Wifi Password" icon={Key} value={formData.property_details.wifi_password} onChange={(v: string) => updateNested('property_details', 'wifi_password', v)} isEditing={isEditing} />

                <EditField
                    label="Property Type"
                    icon={Home}
                    value={formData.property_details.type}
                    onChange={(v: string) => updateNested('property_details', 'type', v)}
                    placeholder="Single Family"
                    isEditing={isEditing}
                    type="select"
                    options={["Single Family", "Townhouse", "Condo", "Commercial"]}
                />
                <EditField label="Home Age" icon={Calendar} value={formData.property_details.age} onChange={(v: string) => updateNested('property_details', 'age', v)} placeholder="~1990" isEditing={isEditing} />

                <div className="col-span-2">
                    <EditField label="Parking Notes" icon={Car} value={formData.property_details.parking} onChange={(v: string) => updateNested('property_details', 'parking', v)} type="textarea" placeholder="Driveway ok, or Street Park only" isEditing={isEditing} />
                </div>
            </div>
        </GlassCard>
    );
};

// ------------------------------------------------------------------
// 2. HOUSEHOLD VIBE CARD
// ------------------------------------------------------------------
export const HouseholdVibeCard = ({ formData, updateNested, isEditing, mode = 'admin' }: BaseCardProps) => {
    return (
        <GlassCard className="p-6 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-orange-300 border-b border-white/10 pb-2">
                <Coffee className="w-5 h-5" /> {mode === 'client' ? "Household Info" : "Household Vibe"}
            </h2>
            <div className="grid grid-cols-1 gap-4">
                <EditField label="Spouse / Partner" icon={User} value={formData.personal_details.spouse} onChange={(v: string) => updateNested('personal_details', 'spouse', v)} isEditing={isEditing} />
                <EditField label="Kids" icon={User} value={formData.personal_details.kids} onChange={(v: string) => updateNested('personal_details', 'kids', v)} placeholder="Names & ages" isEditing={isEditing} />

                <div className="group bg-orange-500/5 p-3 rounded-lg border border-orange-500/10">
                    <EditField label="Pets (Crucial!)" icon={Dog} value={formData.personal_details.pets} onChange={(v: string) => updateNested('personal_details', 'pets', v)} placeholder="Name (Type) - Temperament" isEditing={isEditing} />
                </div>

                <EditField label="Hobbies / Interests" icon={Heart} value={formData.personal_details.hobbies} onChange={(v: string) => updateNested('personal_details', 'hobbies', v)} isEditing={isEditing} />

                {/* Flags */}
                <div className="flex gap-2 pt-2">
                    <div className={`px-2 py-1 rounded text-xs border cursor-pointer ${formData.personal_details.is_veteran ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-transparent border-white/10 text-zinc-500'}`}
                        onClick={() => isEditing && updateNested('personal_details', 'is_veteran', !formData.personal_details.is_veteran)}
                    >
                        <Flag className="w-3 h-3 inline mr-1" /> Veteran
                    </div>
                </div>
            </div>
        </GlassCard>
    );
};

// ------------------------------------------------------------------
// 3. OPERATIONAL INTEL CARD
// ------------------------------------------------------------------
export const OperationalIntelCard = ({ formData, updateNested, isEditing, mode = 'admin' }: BaseCardProps) => {
    return (
        <GlassCard className="p-6 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-red-300 border-b border-white/10 pb-2">
                <AlertTriangle className="w-5 h-5" /> {mode === 'client' ? "Service Preferences" : "Operational Intel"}
            </h2>
            <div className="space-y-4">
                <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    <EditField label="Allergies / Sensitivities" icon={AlertTriangle} value={formData.preferences.allergies} onChange={(v: string) => updateNested('preferences', 'allergies', v)} placeholder="Dust, noise, chemicals" isEditing={isEditing} />
                </div>
                <EditField label="Work Hour Restrictions" icon={Clock} value={formData.preferences.work_hours} onChange={(v: string) => updateNested('preferences', 'work_hours', v)} placeholder="No start before 9am" isEditing={isEditing} />
                <EditField label="Neighbor Considerations" icon={Users} value={formData.preferences.neighbors} onChange={(v: string) => updateNested('preferences', 'neighbors', v)} placeholder="Warn neighbor at #42" isEditing={isEditing} />
                <EditField label="Property Quirks" icon={Layers} value={formData.property_details.quirks} onChange={(v: string) => updateNested('property_details', 'quirks', v)} type="textarea" placeholder="Breaker in garage behind shelf" isEditing={isEditing} />
            </div>
        </GlassCard>
    );
};

// ------------------------------------------------------------------
// 4. FUTURE OPPORTUNITIES CARD (Internal Only usually)
// ------------------------------------------------------------------
export const FutureOpportunitiesCard = ({ formData, updateNested, isEditing, mode = 'admin' }: BaseCardProps) => {
    // If client mode, we might want to hide this ENTIRELY, or show "Requested Work"
    // Strategy says: Internal Only.
    if (mode === 'client') return null;

    const addOpportunity = () => {
        const currentOps = formData.property_details.future_opportunities || [];
        updateNested('property_details', 'future_opportunities', [...currentOps, { id: Date.now(), text: "", date: new Date().toISOString() }]);
    };

    const updateOpportunity = (id: number, text: string) => {
        const currentOps = formData.property_details.future_opportunities || [];
        const updatedOps = currentOps.map((op: any) => op.id === id ? { ...op, text } : op);
        updateNested('property_details', 'future_opportunities', updatedOps);
    };

    const removeOpportunity = (id: number) => {
        const currentOps = formData.property_details.future_opportunities || [];
        const updatedOps = currentOps.filter((op: any) => op.id !== id);
        updateNested('property_details', 'future_opportunities', updatedOps);
    };

    return (
        <GlassCard className="p-6 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -z-10" />
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <h2 className="text-lg font-bold flex items-center gap-2 text-purple-300">
                    <Telescope className="w-5 h-5" /> Future Opportunities
                </h2>
                {isEditing && (
                    <button onClick={addOpportunity} className="bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 p-1 rounded transition-colors">
                        <Plus className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="space-y-3 max-h-[300px] overflow-auto pr-1">
                {formData.property_details.future_opportunities?.length > 0 ? (
                    formData.property_details.future_opportunities.map((op: any) => (
                        <div key={op.id} className="group relative">
                            {isEditing ? (
                                <div className="flex gap-2">
                                    <input
                                        className="w-full bg-black/20 border border-white/10 rounded px-2 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                                        value={op.text}
                                        onChange={(e) => updateOpportunity(op.id, e.target.value)}
                                        placeholder="e.g. Paint basement in 6 months"
                                        autoFocus={!op.text}
                                    />
                                    <button
                                        onClick={() => removeOpportunity(op.id)}
                                        className="text-red-400 hover:bg-red-500/10 p-2 rounded"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/10 p-3 rounded-lg transition-colors">
                                    <p className="text-sm text-zinc-200">{op.text}</p>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-6 text-zinc-600 italic text-sm border-2 border-dashed border-white/5 rounded-lg">
                        No future opportunities logged.
                    </div>
                )}
            </div>
        </GlassCard>
    );
};
