// ============================================================
// Shared Kernel — Main entry point
// ============================================================

import { createClient } from '@supabase/supabase-js';

export * from './domain/index.js';

/**
 * Create a configured Supabase client using environment variables.
 * Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from process.env.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}
