import { createClient } from "@supabase/supabase-js";

// Load Supabase credentials from Next.js environment variables.
// Fallback to placeholder credentials if variables are not yet defined, 
// allowing the build process and baseline page renders to succeed without errors.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyYW5kb20iOiJwbGFjZWhvbGRlciJ9.placeholderanonkey";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
