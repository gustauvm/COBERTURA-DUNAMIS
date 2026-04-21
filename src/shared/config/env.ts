export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://bvpcbviggbxnpqoprnxq.supabase.co',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2cGNidmlnZ2J4bnBxb3BybnhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0OTAzMTYsImV4cCI6MjA4OTA2NjMxNn0.ViZumUOJRgeCdpv6eVlcsSwv10WBAgp7mqZHaWEdkZs',
}

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)
