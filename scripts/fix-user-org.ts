
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUserOrganization() {
    console.log("Fixing user organization...");

    // 1. Get the latest user
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError || !users || users.length === 0) {
        console.error("No users found.", userError);
        return;
    }

    const user = users[0]; // Grab the first user for simplicity in this dev environment
    console.log(`Checking user: ${user.email} (${user.id})`);

    // 2. Check/Create Organization
    let orgId: string;
    const { data: existingOrg } = await supabase.from('organizations').select('id').eq('name', "Frank's Improvements").single();

    if (existingOrg) {
        orgId = existingOrg.id;
        console.log("Found existing organization:", orgId);
    } else {
        const { data: newOrg, error: orgError } = await supabase
            .from('organizations')
            .insert({ name: "Frank's Improvements" })
            .select()
            .single();

        if (orgError) {
            console.error("Failed to create org:", orgError);
            return;
        }
        orgId = newOrg.id;
        console.log("Created new organization:", orgId);
    }

    // 3. Update/Create User Profile
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profile) {
        if (profile.organization_id !== orgId) {
            console.log("Updating user profile with org ID...");
            await supabase.from('user_profiles').update({ organization_id: orgId }).eq('id', user.id);
        } else {
            console.log("User profile already has correct organization.");
        }
    } else {
        console.log("Creating user profile...");
        const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
                id: user.id,
                email: user.email,
                role: 'owner',
                organization_id: orgId,
                name: "Frank"
            });

        if (insertError) console.error("Failed to create profile:", insertError);
    }

    console.log("Done!");
}

fixUserOrganization();
