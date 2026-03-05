// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAZIONE SUPABASE
// Sostituisci i valori qui sotto con le tue chiavi da supabase.com
// Le trovi in: Project Settings → API
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = 'https://ltesmompnluohtsolrfu.supabase.co'   // ← incolla qui la tua URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0ZXNtb21wbmx1b2h0c29scmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDEwMDksImV4cCI6MjA4ODMxNzAwOX0.Sl9toZf1--sepvm6q6Z9jmAZktbu8TWsM0eZrGKqZIU' // ← incolla qui la tua anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
