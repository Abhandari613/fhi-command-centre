
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env.local');
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf-8');
} catch (e) {
    console.error("Could not read .env.local");
    process.exit(1);
}

const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim();
    }
});

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
    console.log("--- START DIAGNOSTICS ---");

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
    const { data: profile, error: profileError } = await adminClient
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error("Profile Error:", profileError);
        // Try creating profile if missing
        console.log("Creating default profile...");
        // Need an organization first
        const { data: org, error: orgError } = await adminClient.from('organizations').insert({ name: 'Test Org' }).select().single();
        if (orgError) console.error("Org Create Error:", orgError);

        if (org) {
            const { error: createProfileError } = await adminClient.from('user_profiles').insert({
                id: user.id,
                organization_id: org.id,
                full_name: "Test User",
                role: "admin"
            });
            if (createProfileError) console.error("Create Profile Error:", createProfileError);
            else console.log("Profile created with Org ID:", org.id);
        }
    } else {
        console.log("Profile found:", profile);
        if (!profile.organization_id) {
            console.error("CRITICAL: User has no organization_id!");
        }
    }

    // 3. Test Login & Insert (RLS Check)
    console.log("Testing Login & Insert with ANON key...");
    const { data: sessionData, error: loginError } = await anonClient.auth.signInWithPassword({
        email,
        password
    });

    if (loginError) {
        console.error("Login Failed:", loginError);
        return;
    }

    console.log("Login Successful. Token:", sessionData.session?.access_token.substring(0, 20) + "...");

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${sessionData.session?.access_token}`
            }
        }
    });

    console.log("Attempting Client Insert...");
    const testClientName = "Diagnostic Client " + Date.now();

    // We need the org_id from the profile check earlier to form a valid request
    // But realistically the RLS might depend on it.
    // The insert we want to test mimics the server action:
    // .insert({ organization_id: ..., name: ... })

    // Let's get the profile again with the userClient to make sure RLS lets us read our own profile
    const { data: myProfile, error: myProfileError } = await userClient
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (myProfileError) {
        console.error("RLS Violation? Cannot read own profile:", myProfileError);
    } else {
        console.log("Read own profile successfully. Org ID:", myProfile.organization_id);

        const { data: insertData, error: insertError } = await userClient
            .from('clients')
            .insert({
                organization_id: myProfile.organization_id,
                name: testClientName,
                email: "test@example.com"
            })
            .select()
            .single();

        if (insertError) {
            console.error("INSERT FAILED (RLS/Constraint):", insertError);
        } else {
            console.log("INSERT SUCCESS:", insertData);
        }
    }

    console.log("--- END DIAGNOSTICS ---");
}

runDiagnostics().catch(console.error);
