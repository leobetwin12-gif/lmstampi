// ─────────────────────────────────────────────────────────────────────────────
// OPERAZIONI DATABASE — tutte le chiamate a Supabase sono qui
// L'app non tocca Supabase direttamente, passa sempre da queste funzioni
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase.js'

// ── MATERIALI ─────────────────────────────────────────────────────────────────
export async function fetchMateriali() {
  const { data, error } = await supabase
    .from('materiali')
    .select('*')
    .order('nome', { ascending: true })
  if (error) throw error
  return data
}

export async function upsertMateriale(materiale) {
  // upsert = insert se nuovo, update se esiste già (per id)
  const payload = { ...materiale }
  if (!payload.id) delete payload.id  // lascia che Supabase assegni l'id
  const { data, error } = await supabase
    .from('materiali')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMateriale(id) {
  const { error } = await supabase
    .from('materiali')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── STAMPI ────────────────────────────────────────────────────────────────────
export async function fetchStampi() {
  const { data, error } = await supabase
    .from('stampi')
    .select('*')
    .order('codice', { ascending: true })
  if (error) throw error
  return data
}

export async function upsertStampo(stampo) {
  const payload = { ...stampo }
  if (!payload.id) delete payload.id
  const { data, error } = await supabase
    .from('stampi')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteStampo(id) {
  const { error } = await supabase
    .from('stampi')
    .delete()
    .eq('id', id)
  if (error) throw error
}
