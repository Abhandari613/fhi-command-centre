
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const targetEmail = 'atul@613physio.com';

    // 1. Get the Organization
    const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
    if (!orgs || orgs.length === 0) {
        console.error('No organization found!');
        return;
    }
    const orgId = orgs[0].id;
    console.log(`Using Organization ID: ${orgId}`);

    // 2. Get the User ID
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const targetUser = users.find(u => u.email === targetEmail);

    if (!targetUser) {
        console.error(`User ${targetEmail} not found!`);
        return;
    }
    console.log(`Found User ID: ${targetUser.id}`);

    // 3. Update User Profile
    const { error } = await supabase
        .from('user_profiles')
        .update({ organization_id: orgId })
        .eq('id', targetUser.id);

    if (error) {
        console.error('Error updating profile:', error);
    } else {
        console.log(`Successfully updated organization for ${targetEmail}`);
    }
}

main().catch(console.error);
