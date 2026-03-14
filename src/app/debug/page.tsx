import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';

export default async function DebugPage() {
    const supabase = await createClient();
    const logs = [];

    // 1. Check Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    logs.push({ step: "Auth Check", user: user ? { id: user.id, email: user.email } : null, error: authError });

    let orgId = null;

    if (user) {
        // 2. Check Profile & Org
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        logs.push({ step: "Profile Check", profile, error: profileError });
        orgId = profile?.organization_id;

        // 3. Test Client Insertion (Rollback intended or test data)
        if (orgId) {
            const testClient = {
                organization_id: orgId,
                name: "Debug Client " + Date.now(),
                email: "debug@test.com"
            };

            const { data: insertData, error: insertError } = await supabase
                .from('clients')
                .insert(testClient)
                .select()
                .single();

            logs.push({ step: "Insert Client Check", data: insertData, error: insertError });
        } else {
            logs.push({ step: "Insert Client Check", status: "Skipped - No Org ID" });
        }
    }

    return (
        <div className="p-8 bg-black text-green-400 font-mono text-sm whitespace-pre-wrap">
            <h1 className="text-xl font-bold mb-4">System Diagnostics</h1>
            {JSON.stringify(logs, null, 2)}
        </div>
    );
}
