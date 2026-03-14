
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


import fs from 'fs';

async function main() {
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const targetUser = users.find(u => u.email === 'atul@613physio.com');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let profile: any = null;

    if (targetUser) {
        const { data } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', targetUser.id)
            .single();
        profile = data;
    }

    const output = {
        user: targetUser,
        profile
    };

    fs.writeFileSync('debug_atul.json', JSON.stringify(output, null, 2));
    console.log('Written detailed info for atul to debug_atul.json');
}

main().catch(console.error);
