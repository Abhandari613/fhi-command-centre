
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { ClientProfileView } from "@/app/(app)/ops/clients/[id]/ClientProfileView";
import { AuroraBackground } from "@/components/layout/AuroraBackground";

interface OnboardingPageProps {
    params: Promise<{ id: string }>;
}

export default async function OnboardingPage({ params }: OnboardingPageProps) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch Client Details
    const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

    if (clientError || !client) {
        // In a real generic onboarding, we might create a new client or show a generic form.
        // For now, we assume we are editing an existing profile via a link.
        notFound();
    }

    return (
        <div className="min-h-screen relative text-foreground">
            <AuroraBackground />
            <div className="relative z-10 max-w-4xl mx-auto p-6 md:py-12">

                {/* Intro / Welcome Message for Client */}
                <div className="mb-8 text-center space-y-4">
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                        Welcome, {client.name.split(' ')[0]}!
                    </h1>
                    <p className="text-lg text-indigo-200 max-w-2xl mx-auto leading-relaxed">
                        To help us serve you better, please take a moment to confirm your details and tell us a bit about your home and preferences.
                    </p>
                </div>

                <ClientProfileView
                    client={client}
                    jobs={[]} // We don't show jobs in onboarding, but prop is required
                    mode="client"
                />
            </div>
        </div>
    );
}
