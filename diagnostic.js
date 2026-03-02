
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
    console.error('.env file not found');
    process.exit(1);
}
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnostic() {
    console.log('Testing global_settings table...');
    const { data, error } = await supabase.from('global_settings').select('count').limit(1);

    if (error) {
        console.log('ERROR:', error);
        if (error.code === '42P01') {
            console.log('RESULT: global_settings table does NOT exist.');
        }
    } else {
        console.log('RESULT: global_settings table exists.');
    }
}

diagnostic();
