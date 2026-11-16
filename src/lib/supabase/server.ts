import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabasePublicEnv } from "@/lib/env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Usa a sessão do usuário (cookies) e a chave pública; o RLS é aplicado normalmente.
 *
 * Para validar quem é o usuário no servidor, use `supabase.auth.getUser()`
 * (não confie apenas em `getSession()`).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabasePublicEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado a partir de um Server Component, onde não é possível gravar cookies.
          // Sem problema: o proxy (src/proxy.ts) renova a sessão a cada requisição.
        }
      },
    },
  });
}
