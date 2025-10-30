import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL as string
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Supabase env vars are missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
