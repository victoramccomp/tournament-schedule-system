/**
 * Variáveis de ambiente do Supabase.
 *
 * Atenção: as variáveis NEXT_PUBLIC_* precisam ser lidas com o nome literal
 * (process.env.NEXT_PUBLIC_X) para o Next.js substituí-las no bundle do navegador.
 */

function publicUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function publicKey(): string | undefined {
  // Projetos novos usam a chave "publishable"; projetos antigos, a "anon".
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function hasSupabasePublicEnv(): boolean {
  return Boolean(publicUrl() && publicKey());
}

export function supabasePublicEnv(): { url: string; key: string } {
  const url = publicUrl();
  const key = publicKey();
  if (!url) {
    throw new Error("Variável de ambiente ausente: NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!key) {
    throw new Error(
      "Variável de ambiente ausente: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    );
  }
  return { url, key };
}
