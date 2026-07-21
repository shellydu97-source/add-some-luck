import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const isCloudAccountConfigured = Boolean(supabaseUrl && supabasePublishableKey)

let clientPromise: Promise<SupabaseClient | undefined> | undefined

export function getSupabaseClient() {
  if (!isCloudAccountConfigured) return Promise.resolve(undefined)
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => createClient(
      supabaseUrl!,
      supabasePublishableKey!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      },
    ))
  }
  return clientPromise
}
