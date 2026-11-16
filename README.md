# Agenda de Torneios

Sistema web para lojas de card games cadastrarem torneios e verem tudo em um calendário, com alertas de capacidade e horário e torneios recorrentes.

📋 Planejamento completo: [PLANEJAMENTO.md](PLANEJAMENTO.md)

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 + shadcn/ui (tema neutro) · Supabase (Postgres + Auth) · Vercel · Vitest · GitHub Actions

## Fluxo de trabalho: nada roda localmente

O desenvolvimento é feito sem instalar/rodar nada na máquina local:

| O quê | Onde |
|---|---|
| Lint, testes, build e tipos | GitHub Actions (`.github/workflows/ci.yml`) |
| Teste do fluxo real (login, torneios, calendário) | Preview Deployment da Vercel (um por branch/PR) |
| Migrations e RLS | SQL Editor do Supabase (arquivos versionados em `supabase/migrations/`) |

> Como não há `npm install` local, o `package-lock.json` é gerado pelo workflow manual **Gerar package-lock** (GitHub → Actions → *Gerar package-lock* → *Run workflow*). Depois disso o CI passa a usar `npm ci`.

## Configuração inicial (Etapa 0) — passos manuais

### 1. Supabase

1. Criar um projeto (sugestão: um `dev` para os previews e um `prod`).
2. **Authentication → Sign In / Providers:** manter *Email* ligado e **desligar "Allow new users to sign up"** (acesso só por convite).
3. **Authentication → Email Templates → Invite user:** apontar o link para o app:
   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/definir-senha
   ```
   (faça o equivalente no template *Reset password* com `type=recovery&next=/definir-senha`)
4. **Authentication → URL Configuration:** definir *Site URL* (a URL da Vercel) e incluir em *Redirect URLs* as URLs de preview (`https://*-SEU-TIME.vercel.app/**`).
5. Anotar: **Project URL**, **publishable key** e **secret key (service_role)** em *Project Settings → API Keys*.

### 2. Vercel

1. *Add New → Project* e importar este repositório (framework: Next.js, detectado automaticamente).
2. Cadastrar as variáveis em *Settings → Environment Variables* (veja [.env.example](.env.example)):

   | Variável | Observação |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave publishable (ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` em projetos antigos) |
   | `NEXT_PUBLIC_SITE_URL` | URL pública do app |
   | `SUPABASE_SERVICE_ROLE_KEY` | **somente servidor**; nunca com prefixo `NEXT_PUBLIC_` |

   Use o projeto Supabase `dev` em *Preview* e o `prod` em *Production*.

### 3. Seu usuário admin

1. No Supabase: *Authentication → Users → Add user* (seu e-mail + senha).
2. Depois que a migration inicial (Etapa 1) for aplicada, inserir o `user_id` na tabela `admins`:
   ```sql
   insert into admins (user_id) values ('SEU-USER-ID');
   ```

### 4. Lockfile

GitHub → *Actions* → **Gerar package-lock** → *Run workflow* (uma vez, e sempre que mudar dependências).

## Estrutura

```
src/
  app/                    # rotas (App Router)
  components/ui/          # componentes shadcn/ui
  lib/
    env.ts                # leitura das variáveis de ambiente
    supabase/
      client.ts           # navegador (chave pública)
      server.ts           # Server Components/Actions (sessão do usuário)
      proxy.ts            # renova sessão e protege /painel e /admin
      admin.ts            # service_role — server-only, só no /admin
  proxy.ts                # entrada do proxy do Next.js 16
.github/workflows/        # CI e geração do lockfile
```

## Roadmap

Etapas 0 a 5 em [PLANEJAMENTO.md](PLANEJAMENTO.md#12-roadmap).
