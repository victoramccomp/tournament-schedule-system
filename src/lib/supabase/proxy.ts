import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { hasSupabasePublicEnv, supabasePublicEnv } from "@/lib/env";

/** Rotas que exigem usuário autenticado. */
const ROTAS_PROTEGIDAS = ["/painel", "/admin"];

function ehProtegida(pathname: string) {
  return ROTAS_PROTEGIDAS.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );
}

/**
 * Renova a sessão do Supabase (cookies) e redireciona para /login
 * quando uma rota protegida é acessada sem usuário autenticado.
 *
 * A checagem de "usuário vinculado a uma loja" e de "é admin" é feita nas
 * páginas/ações do servidor (etapa 1), nunca apenas aqui.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!hasSupabasePublicEnv()) {
    console.error(
      "[proxy] Variáveis do Supabase não configuradas (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
    );
    // Sem configuração, rotas protegidas ficam indisponíveis (nunca liberadas).
    if (ehProtegida(pathname)) {
      return new NextResponse("Serviço não configurado.", { status: 503 });
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const { url, key } = supabasePublicEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Não coloque lógica entre createServerClient e getUser(): getUser() valida o
  // token no Supabase e dispara a renovação da sessão.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && ehProtegida(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
