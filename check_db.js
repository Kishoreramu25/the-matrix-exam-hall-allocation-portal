
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars manually since we are running this with node
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('Checking database connection...');

    // Try to select from exams table
    const { data, error } = await supabase.from('exams').select('count').limit(1);

    if (error) {
        if (error.code === '42P01') { // undefined_table
            console.error('❌ Database tables are MISSING.');
            console.log('\nYOU MUST RUN THE SQL SCRIPT IN SUPABASE DASHBOARD.');
            console.log('1. Go to https://supabase.com/dashboard/project/oofwbpyygrcwhiyxckzh/sql');
            console.log('2. Click "New Query"');
            console.log('3. Copy and paste the content of "setup_database.sql"');
            console.log('4. Click "Run"');
        } else {
            console.error('❌ Connection failed:', error.message);
        }
    } else {
        console.log('✅ Database tables appear to be set up!');
    }
}

checkTables();
