import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project credentials
const supabaseUrl = 'https://qwyftjzaeettvxfmjieu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3eWZ0anphZWV0dHZ4Zm1qaWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MzQ2MDcsImV4cCI6MjA2NjMxMDYwN30.R58ZBi0MAEmAY13tQU43JoMlqw4K8duC__VnCquMEAM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

console.log('✅ Supabase client initialized successfully!');

export default supabase; 