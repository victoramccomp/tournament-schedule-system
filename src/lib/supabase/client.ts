import { createBrowserClient } from "@supabase/ssr";

import { supabasePublicEnv } from "@/lib/env";

/** Cliente Supabase para Client Components (navegador). Usa só a chave pública. */
export function createClient() {
  const { url, key } = supabasePublicEnv();
  return createBrowserClient(url, key);
}
