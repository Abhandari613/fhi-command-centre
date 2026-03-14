
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env.local');
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf-8');
} catch (e) {
    console.error("Could not read .env.local");
    process.exit(1);
}

const envVars = {};
envContent.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    const idx = line.indexOf('=');
    if (idx !== -1) {
        const key = line.substring(0, idx).trim();
        const value = line.substring(idx + 1).trim();
        envVars[key] = value;
    }
});

console.log("Loaded keys:", Object.keys(envVars));
if (envVars['NEXT_PUBLIC_SUPABASE_URL']) console.log("URL found:", envVars['NEXT_PUBLIC_SUPABASE_URL']);
if (envVars['SUPABASE_SERVICE_ROLE_KEY']) console.log("Service Key found (length):", envVars['SUPABASE_SERVICE_ROLE_KEY'].length);

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_ANON_KEY = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const SUPABASE_SERVICE_ROLE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase keys in .env.local");
    process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runDiagnostics() {
    console.log("--- START DIAGNOSTICS (JS) ---");

    // 1. Check User
    const email = "user@fhi.com";
    const password = "password";

    console.log(`Checking user: ${email}`);
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();

    if (listError) {
        console.error("Failed to list users:", listError);
        return;
    }

    let user = users.find(u => u.email === email);

    if (!user) {
        console.log("User not found. Creating...");
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });
        if (createError) {
            console.error("Failed to create user:", createError);
            return;
        }
        user = newUser.user;
        console.log("User created:", user?.id);
    } else {
        console.log("User found:", user.id);
        // Reset password to ensure we can login
        const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, { password });
        if (updateError) {
            console.error("Failed to reset password:", updateError);
        } else {
            console.log("Password reset to 'password'");
        }
    }

    if (!user) return;

    // 2. Check Profile
    console.log("Checking User Profile...");
    let { data: profile, error: profileError } = await adminClient
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError && profileError.code !== 'PGRST116') {
        console.error("Unexpected Profile Error:", profileError);
        return;
    }

    if (!profile) {
        console.log("Profile not found. Creating...");
        // Implement inline creation logic
        // 1. Ensure Org exists
        let { data: org, error: orgError } = await adminClient.from('organizations').insert({ name: 'Frank\'s Improvements' }).select().single();
        if (orgError) {
            console.log("Org creation failed, maybe exists?");
            // Try to find it
            const { data: existingOrg } = await adminClient.from('organizations').select().limit(1).single();
            org = existingOrg;
        }

        if (org) {
            const { error: createProfileError } = await adminClient.from('user_profiles').insert({
                id: user.id,
                organization_id: org.id,
                full_name: "Test User",
                role: "admin",
                email: email
            });
            if (createProfileError) {
                console.error("Failed to create profile:", createProfileError);
            } else {
                console.log("Profile created and linked to Org:", org.id);
                // Refresh profile
                const { data: p } = await adminClient.from('user_profiles').select('*').eq('id', user.id).single();
                profile = p;
            }
        } else {
            console.error("Could not find or create an Organization. Aborting.");
            return;
        }
    } else {
        console.log("Profile found:", profile.id);
    }

    // Now safeguard: Check Organization ID
    if (profile && !profile.organization_id) {
        console.log("CRITICAL: User has no organization_id! Fixing...");

        // Find an org
        let { data: org } = await adminClient.from('organizations').select().limit(1).single();
        if (!org) {
            const { data: newOrg } = await adminClient.from('organizations').insert({ name: 'Frank\'s Improvements' }).select().single();
            org = newOrg;
        }

        if (org) {
            await adminClient
                .from('user_profiles')
                .update({ organization_id: org.id })
                .eq('id', user.id);
            console.log("Fixed: Linked user to Org:", org.id);
            profile.organization_id = org.id; // update local var
        }
    } else if (profile) {
        console.log("Organization ID:", profile.organization_id);
    }

    // 3. Test Client Insert (Verification)
    if (profile && profile.organization_id) {
        console.log("Verifying Client Insert Capability...");
        const testClientName = "Diagnostic Client " + Date.now();

        const { error: insertError } = await adminClient
            .from('clients')
            .insert({
                organization_id: profile.organization_id,
                name: testClientName,
                email: "test@example.com"
            });

        if (insertError) {
            console.error("INSERT FAILED:", insertError);
        } else {
            console.log("INSERT SUCCESS: Client created.");
        }
    }

    console.log("--- END DIAGNOSTICS (JS) ---");
}

runDiagnostics().catch(console.error);
