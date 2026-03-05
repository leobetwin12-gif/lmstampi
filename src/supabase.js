// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAZIONE SUPABASE
// Sostituisci i valori qui sotto con le tue chiavi da supabase.com
// Le trovi in: Project Settings → API
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = 'https://rcuktraoqncshrwvgrmy.supabase.co'   // ← incolla qui la tua URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdWt0cmFvcW5jc2hyd3Zncm15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NzY0NzMsImV4cCI6MjA4ODE1MjQ3M30.yStMv4korNn5xAOJDKUjmFI5JGZ1t52ACudcTWGGZUw' // ← incolla qui la tua anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
