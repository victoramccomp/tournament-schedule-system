import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a `service_role` — IGNORA o RLS.
 *
 * Regras:
 * - Usar SOMENTE na área /admin (convidar usuários, cadastrar lojas, card games).
 * - Toda Server Action/Route do /admin deve verificar, a cada chamada, se o
 *   usuário logado está na tabela `admins` ANTES de usar este cliente.
 * - A chave nunca recebe o prefixo NEXT_PUBLIC_ e nunca vai para o navegador.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Variável de ambiente ausente: NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!serviceRoleKey) {
    throw new Error("Variável de ambiente ausente: SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
