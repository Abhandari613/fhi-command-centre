"use client";

import {
    Telescope, Plus, Trash2, User, Phone, Mail, MapPin, Calendar, Briefcase,
    Wifi, Key, Car, Dog, Coffee, MessageSquare, Edit2, Save, X, Copy, Flag,
    Home, Heart, AlertTriangle, Tag, Clock, DollarSign, Layers, Users, TrendingUp
} from "lucide-react";
import { useState } from "react";
import { updateClientAction } from "@/app/actions/client-actions";
import Link from "next/link";
import { EditField, AddressEditField } from "@/components/clients/ClientProfileComponents";
import {
    PropertyIntelCard,
    HouseholdVibeCard,
    OperationalIntelCard,
    FutureOpportunitiesCard
} from "@/components/clients/ClientProfileCards";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";

interface ClientProfileViewProps {
    client: any;
    jobs: any[];
    mode?: 'admin' | 'client';
}

export function ClientProfileView({ client: initialClient, jobs, mode = 'admin' }: ClientProfileViewProps) {
    const [client, setClient] = useState(initialClient);
    const [isEditing, setIsEditing] = useState(false);

    // Form State (Deep merge or individual category handling ideally, but flat state for now works)
    const [formData, setFormData] = useState({
        ...initialClient,
        property_details: initialClient.property_details || {},
        preferences: initialClient.preferences || {},
        personal_details: initialClient.personal_details || {},
        marketing_info: initialClient.marketing_info || {},
        notes: initialClient.notes || ""
    });

    const handleSave = async () => {
        const result = await updateClientAction(client.id, {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            notes: formData.notes,
            property_details: formData.property_details,
            preferences: formData.preferences,
            personal_details: formData.personal_details,
            marketing_info: formData.marketing_info,
        });

        if (result.success) {
            setClient({ ...client, ...formData });
            setIsEditing(false);
        } else {
            alert("Failed to save changes: " + result.error);
        }
    };

    const updateField = (field: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const updateNested = (category: string, field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            [category]: {
                ...prev[category],
                [field]: value
            }
        }));
    };

    // Stats Calculation
    const totalJobs = jobs?.length || 0;
    const activeJobs = jobs?.filter(j => j.status === 'in_progress' || j.status === 'scheduled').length || 0;
    const totalRevenue = jobs?.reduce((acc, job) => acc + (job.total_amount || 0), 0) || 0;

    return (
        <div className="space-y-8 max-w-7xl mx-auto">

            {/* 1. HERO / IDENTITY */}
            <div className="relative">
                <div className="absolute top-0 right-0 p-4 z-10 flex gap-2">
                    {mode === 'admin' && (
                        <Link href={`/ops/quotes/create?clientId=${client.id}`}>
                            <AnimatedButton
                                variant="secondary"
                                className="backdrop-blur-md bg-indigo-500/20 hover:bg-indigo-500/40 border-indigo-500/30"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Create Job
                            </AnimatedButton>
                        </Link>
                    )}
                    {isEditing && (
                        <AnimatedButton
                            variant="primary"
                            onClick={handleSave}
                            className="bg-green-500 text-black border-green-400 hover:bg-green-400 backdrop-blur-md"
                        >
                            <Save className="w-4 h-4 mr-2" /> Save
                        </AnimatedButton>
                    )}
                    <AnimatedButton
                        variant={isEditing ? "danger" : "secondary"}
                        onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
                        className="backdrop-blur-md"
                    >
                        {isEditing ? <X className="w-4 h-4 mr-2" /> : <Edit2 className="w-4 h-4 mr-2" />}
                        {isEditing ? "Cancel" : "Edit Profile"}
                    </AnimatedButton>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Avatar */}
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 shrink-0 shadow-2xl relative group">
                        <span className="text-4xl md:text-5xl font-black text-white">
                            {client.name ? client.name.charAt(0).toUpperCase() : '?'}
                        </span>
                        {client.marketing_info?.status === 'VIP' && (
                            <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full border-2 border-black flex items-center gap-1">
                                <Heart className="w-3 h-3 fill-black" /> VIP
                            </div>
                        )}
                    </div>

                    <div className="flex-1 w-full space-y-4">
                        {/* Name & Title */}
                        <div>
                            {isEditing ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                    <input
                                        className="text-3xl font-black bg-transparent border-b border-white/20 focus:border-indigo-500 text-white w-full outline-none placeholder:text-zinc-700"
                                        value={formData.name}
                                        onChange={e => updateField('name', e.target.value)}
                                        placeholder="Full Name"
                                    />
                                    <input
                                        className="text-xl font-medium bg-transparent border-b border-white/20 focus:border-indigo-500 text-indigo-300 w-full outline-none placeholder:text-zinc-700"
                                        value={formData.personal_details.nickname || ""}
                                        onChange={e => updateNested('personal_details', 'nickname', e.target.value)}
                                        placeholder="Nickname (e.g. Bobby)"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-baseline gap-3 flex-wrap">
                                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                                        {client.name}
                                    </h1>
                                    {client.personal_details?.nickname && (
                                        <span className="text-2xl text-indigo-400 font-serif italic">
                                            "{client.personal_details.nickname}"
                                        </span>
                                    )}
                                </div>
                            )}


                            {/* Quick Stats Row - Admin Only */}
                            {mode === 'admin' && (
                                <div className="flex flex-wrap gap-4 mt-4">
                                    <div className="flex items-center gap-2 text-zinc-400 text-sm bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                        <Briefcase className="w-4 h-4 text-indigo-400" />
                                        <span className="text-white font-bold">{totalJobs}</span> Jobs
                                    </div>
                                    <div className="flex items-center gap-2 text-zinc-400 text-sm bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                        <DollarSign className="w-4 h-4 text-green-400" />
                                        <span className="text-white font-bold">${totalRevenue.toLocaleString()}</span> Lifetime
                                    </div>
                                    <div className="flex items-center gap-2 text-zinc-400 text-sm bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                        <Clock className="w-4 h-4 text-blue-400" />
                                        Since {new Date(client.created_at).getFullYear()}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Contact Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5">
                            <EditField
                                label="Phone"
                                icon={Phone}
                                value={formData.phone}
                                onChange={(v: string) => updateField('phone', v)}
                                placeholder="555-0123"
                                isEditing={isEditing}
                            />
                            <EditField
                                label="Email"
                                icon={Mail}
                                value={formData.email}
                                onChange={(v: string) => updateField('email', v)}
                                placeholder="user@example.com"
                                isEditing={isEditing}
                            />
                            <AddressEditField
                                label="Address"
                                icon={MapPin}
                                value={formData.address}
                                onChange={(v: string) => updateField('address', v)}
                                placeholder="123 Main St"
                                isEditing={isEditing}
                            />
                            <EditField
                                label="Preferred Channel"
                                icon={MessageSquare}
                                type="select"
                                options={["SMS", "WhatsApp", "Email", "Phone"]}
                                value={formData.preferences.preferred_channel}
                                onChange={(v: string) => updateNested('preferences', 'preferred_channel', v)}
                                placeholder="Select..."
                                isEditing={isEditing}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* LEFT COLUMN - MAIN INFO */}
                <div className="md:col-span-2 space-y-6">
                    <HouseholdVibeCard
                        formData={formData}
                        updateNested={updateNested}
                        isEditing={isEditing}
                        mode={mode}
                    />
                    <PropertyIntelCard
                        formData={formData}
                        updateNested={updateNested}
                        isEditing={isEditing}
                        mode={mode}
                    />
                    <OperationalIntelCard
                        formData={formData}
                        updateNested={updateNested}
                        isEditing={isEditing}
                        mode={mode}
                    />
                    <FutureOpportunitiesCard
                        formData={formData}
                        updateNested={updateNested}
                        isEditing={isEditing}
                        mode={mode}
                    />
                </div>

                {/* RIGHT COLUMN - SIDEBAR */}
                <div className="space-y-6">
                    {/* PREFERRED CHANNEL */}
                    <GlassCard className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <MessageSquare className="w-4 h-4 text-blue-400" />
                            </div>
                            <h3 className="font-bold">Preferred Channel</h3>
                        </div>
                        <EditField
                            label=""
                            value={formData.preferences?.preferred_channel || 'text'}
                            onChange={(val) => updateNested('preferences', 'preferred_channel', val)}
                            isEditing={isEditing}
                            type="select"
                            options={[
                                { value: 'text', label: 'Text Message' },
                                { value: 'email', label: 'Email' },
                                { value: 'phone', label: 'Phone Call' }
                            ]}
                        />
                    </GlassCard>

                    {/* ONLY SHOW IN ADMIN MODE */}
                    {mode === 'admin' && (
                        <>
                            {/* STATS */}
                            <GlassCard className="p-6">
                                <h3 className="font-bold mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-primary" />
                                    Client Stats
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 rounded-lg bg-white/5">
                                        <p className="text-xs text-white/50 uppercase font-bold tracking-wider mb-1">Total Jobs</p>
                                        <p className="text-2xl font-black">{totalJobs}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-white/5">
                                        <p className="text-xs text-white/50 uppercase font-bold tracking-wider mb-1">Total Value</p>
                                        <p className="text-2xl font-black text-emerald-400">${totalRevenue.toLocaleString()}</p>
                                    </div>
                                </div>
                            </GlassCard>

                            {/* MARKETING INFO - Placeholder */}
                            <GlassCard className="p-6">
                                <h2 className="text-lg font-bold flex items-center gap-2 text-green-300 border-b border-white/10 pb-2 mb-4">
                                    <Tag className="w-5 h-5" /> Marketing Info
                                </h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <EditField label="Lead Source" icon={Tag} value={formData.marketing_info.source} onChange={(v: string) => updateNested('marketing_info', 'source', v)} placeholder="Google, Referral" isEditing={isEditing} />
                                    <EditField label="Referred By" icon={User} value={formData.marketing_info.referred_by} onChange={(v: string) => updateNested('marketing_info', 'referred_by', v)} isEditing={isEditing} />
                                    <EditField label="Client Status" icon={Layers} value={formData.marketing_info.status} onChange={(v: string) => updateNested('marketing_info', 'status', v)} placeholder="Active, Lead, VIP" isEditing={isEditing} />
                                    <div className="col-span-2">
                                        <EditField label="General Notes" icon={Edit2} value={formData.notes} onChange={(v: string) => updateField('notes', v)} type="textarea" isEditing={isEditing} />
                                    </div>
                                </div>
                            </GlassCard>

                            {/* RECENT JOBS */}
                            <div className="md:col-span-2 xl:col-span-2">
                                <h2 className="text-lg font-bold flex items-center gap-2 text-white mb-4">
                                    <Briefcase className="w-5 h-5" /> Job History
                                </h2>
                                <div className="grid gap-3">
                                    {jobs && jobs.length > 0 ? jobs.map((job) => (
                                        <Link key={job.id} href={`/ops/jobs/${job.id}`}>
                                            <GlassCard className="p-4 hover:bg-white/5 transition-colors group cursor-pointer flex justify-between items-center">
                                                <div>
                                                    <h3 className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                                                        {job.title}
                                                    </h3>
                                                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                                                        <span>{new Date(job.created_at).toLocaleDateString()}</span>
                                                        <span>•</span>
                                                        <span className={`uppercase font-bold ${job.status === 'completed' ? 'text-green-400' : 'text-blue-400'
                                                            }`}>{job.status?.replace('_', ' ')}</span>
                                                    </div>
                                                </div>
                                                <div className="text-white font-mono font-bold">
                                                    {/* Placeholder amount if available or calculated */}
                                                    ---
                                                </div>
                                            </GlassCard>
                                        </Link>
                                    )) : (
                                        <div className="text-zinc-500 text-sm italic">No jobs recorded.</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {isEditing && (
                <div className="fixed bottom-6 right-6 z-50">
                    <AnimatedButton onClick={handleSave} className="bg-green-500 text-black font-bold shadow-2xl shadow-green-500/20 hover:scale-105">
                        <Save className="w-5 h-5 mr-2" /> Save Full Profile
                    </AnimatedButton>
                </div>
            )}
        </div >
    );
}
