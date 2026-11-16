# Planejamento — Sistema de Agendamento de Torneios

> **Versão 4.1** — incorpora: área `/admin` confirmada, alertas orientados pela capacidade (sem alerta se a capacidade comporta) e a lista inicial de 21 card games.
> Itens marcados com 🔶 são interpretações/decisões minhas — confirme ou corrija na seção 13. ✅ = confirmado por você.

## 1. Visão geral

Sistema web para lojas de card games organizarem e divulgarem seus torneios. Hoje é caótico: a loja tem N torneios, de N card games, num espaço com X lugares e horário de funcionamento fixo. O sistema centraliza o cadastro, mostra tudo num **calendário**, avisa quando um torneio conflita com outro ou com o horário da loja e permite criar torneios **recorrentes** (ex.: "toda sexta, 19h, durante o mês").

## 2. Decisões confirmadas

| Tema | Decisão |
|---|---|
| Autenticação | Supabase Auth, e-mail + senha. |
| Acesso | **Somente por convite manual** (feito por você). Cadastro público desligado. |
| Lojas e usuários | Você cadastra a **loja** e a **lista de usuários** dela. Cada usuário pertence a **uma** loja; uma loja tem **vários** usuários. |
| Card games | **Tabela global** (pré-cadastrada). A loja escolhe, numa **tela de parâmetros**, quais card games ela atua. |
| Espaço | **Único espaço** com X lugares por loja. |
| Área admin | **Sim**, mini área `/admin` no app (lojas, usuários por loja, card games). |
| Permissões | Todos os usuários de uma loja têm as **mesmas permissões** (sem papéis) no MVP. |
| Conflitos | **Só avisam** (não bloqueiam). 🔴 **Vermelho:** horários se sobrepõem **e** a capacidade da loja é excedida. **Se a capacidade comporta, não há alerta.** 🟡 **Amarelo:** fora do horário de funcionamento. Ao criar um torneio no dia X, uma **lista ao lado** mostra os torneios já criados naquele dia, com horário. |
| Card games iniciais | Lista de **21 jogos** definida por você (seção 6). |
| Recorrência | MVP: semanal/quinzenal, **fim obrigatório, período máximo de 1 mês**. |
| Datas | `timestamptz` (UTC) no banco; exibição e cálculo no fuso da loja (`America/Sao_Paulo`). |
| Lógica | Conflitos e geração de ocorrências em **TypeScript puro**; banco só persiste (RPC transacional onde precisar). |
| Recorrência — modelo | Materializada: cada ocorrência é uma linha em `torneios`, ligada a uma série. |
| Stack | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, na Vercel + Supabase. |
| Página pública | `/l/[slug]`, só torneios publicados, no fim do MVP. |
| Visual | **Tema neutro**, cores em variáveis para troca futura. |
| Testes | **Nada roda localmente.** Validação via GitHub Actions + Vercel Preview Deployments (seção 11). |

## 3. Decisões técnicas adicionais (🔶 minhas, ✅ já confirmadas)

1. ✅ **Mini área `/admin` dentro do app** para você: cadastrar loja, convidar/vincular usuários e manter a tabela de card games. Usa a `service_role` **somente no servidor** (seção 7).
2. ✅ **Todos os usuários de uma loja têm as mesmas permissões** (sem papéis tipo dono/funcionário) no MVP.
3. 🔶 **Quem é "admin"** (você): tabela `admins` com o seu `user_id`, inserida uma vez por SQL.
4. 🔶 **`slug` da loja só o admin altera** (mudar quebraria links públicos). A loja edita nome, endereço, capacidade e horários.
5. 🔶 **Alertas orientados pela capacidade** (seção 9): sobreposição de horário só gera alerta se o pico de ocupação **exceder** a capacidade (🔴); se couber, nenhum alerta. Torneios no mesmo dia **sem** sobreposição também não geram alerta (a agenda do dia já os mostra). 🟡 fica só para **fora do horário de funcionamento**.
6. 🔶 **Remover um card game dos parâmetros da loja** é bloqueado enquanto existirem torneios **futuros** dele. Torneios passados continuam exibindo o jogo.
7. 🔶 **Rascunhos entram nos alertas** — o rascunho é um plano real.

## 4. Escopo

### MVP
- Login e recuperação de senha. **Sem cadastro público**; entrada por link de convite (seção 5).
- **Área admin (você):** lojas, usuários por loja, card games.
- **Parâmetros da loja:** nome, endereço, capacidade (X lugares), horário de funcionamento por dia da semana, **card games em que atua**, lista (somente leitura) dos usuários da loja.
- CRUD de torneios: título, card game (só os que a loja atua), início, fim, máx. jogadores, descrição, status `rascunho`/`publicado`.
- **Agenda do dia ao lado** do formulário e do calendário, com alertas amarelo/vermelho.
- **Recorrência** semanal/quinzenal, período máx. 1 mês, com prévia das datas e edição por escopo.
- **Calendário** mês / semana / dia, cores por card game, filtros por jogo e status.
- Lista de torneios com filtros e ações rápidas (publicar/despublicar, duplicar, excluir).
- Página pública somente-leitura da loja.

### Depois do MVP
- Duplicar série para o mês seguinte com 1 clique; recorrência mensal.
- Arrastar torneio no calendário para reagendar.
- Papéis dentro da loja (dono/funcionário); a loja convidar os próprios usuários.
- Inscrição de jogadores, lista de espera, check-in.
- Notificações, pagamentos, chaveamento, PWA, múltiplos espaços por loja.

## 5. Acesso por convite

**Configuração (Supabase):** Authentication → desligar *Allow new users to sign up*. O convite pelo servidor (`auth.admin.inviteUserByEmail`) continua funcionando.

**Fluxo:**
1. **Você** (admin) cria a loja em `/admin/lojas` e adiciona usuários (nome + e-mail) em `/admin/lojas/[id]`.
2. O app envia o convite e grava o vínculo `loja_usuarios` (se o vínculo falhar, o usuário recém-criado é removido — nada de conta órfã).
3. A pessoa recebe o e-mail → `/auth/confirm` valida o token → `/definir-senha`.
4. Entra em `/painel`. Na primeira vez, um aviso pede para completar os **Parâmetros** (horários e card games).
5. Próximos acessos: `/login`. Esqueceu a senha: `/recuperar-senha` (`type=recovery`).

Usuário autenticado **sem vínculo com loja** cai em `/sem-loja` ("sua conta ainda não está vinculada a uma loja").

**Template do e-mail de convite** (*Authentication → Email Templates*, padrão para SSR com `@supabase/ssr`):
`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/definir-senha`

O e-mail embutido do Supabase tem limite baixo de envios/hora; para convites esporádicos serve, mas em produção vale configurar **SMTP próprio** (ex.: Resend).

## 6. Modelo de dados (Postgres / Supabase)

```sql
create type torneio_status as enum ('rascunho', 'publicado');

create table lojas (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null,
  slug               text not null unique,              -- /l/{slug}; só admin altera
  endereco           text,
  capacidade_lugares int  not null default 1 check (capacidade_lugares > 0),  -- espaço único
  timezone           text not null default 'America/Sao_Paulo',
  ativa              boolean not null default true,
  created_at         timestamptz not null default now()
);

-- Cada usuário pertence a UMA loja (PK em user_id); uma loja tem VÁRIOS usuários.
create table loja_usuarios (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  loja_id    uuid not null references lojas(id) on delete cascade,
  nome       text not null,
  email      text not null,                              -- cópia para exibição
  created_at timestamptz not null default now()
);
create index on loja_usuarios (loja_id);

-- Usuários da plataforma (você). Acessada só via service_role.
create table admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Dia sem linha = loja fechada. Mais de uma faixa por dia é permitido (ex.: pausa de almoço).
create table loja_horarios (
  id         uuid primary key default gen_random_uuid(),
  loja_id    uuid not null references lojas(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),  -- 0 = domingo
  abre       time not null,
  fecha      time not null,
  check (fecha > abre)
);

-- Tabela GLOBAL de card games (seed + CRUD pelo admin).
create table card_games (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null unique,
  cor   text not null default '#6366f1',                 -- cor no calendário
  ativo boolean not null default true,
  ordem int not null default 0
);

-- Quais card games cada loja atua (tela de Parâmetros).
create table loja_card_games (
  loja_id      uuid not null references lojas(id) on delete cascade,
  card_game_id uuid not null references card_games(id),
  primary key (loja_id, card_game_id)
);

-- "Modelo" de uma recorrência. As ocorrências reais ficam em `torneios`.
create table torneio_series (
  id                uuid primary key default gen_random_uuid(),
  loja_id           uuid not null references lojas(id) on delete cascade,
  card_game_id      uuid not null references card_games(id),
  titulo            text not null,
  descricao         text,
  max_jogadores     int  not null check (max_jogadores > 0),
  hora_inicio       time not null,                       -- horário local da loja
  duracao_minutos   int  not null check (duracao_minutos > 0),  -- suporta virar a meia-noite
  intervalo_semanas smallint not null default 1 check (intervalo_semanas in (1, 2)),
  dias_semana       smallint[] not null check (cardinality(dias_semana) between 1 and 7),
  data_inicio       date not null,                       -- data local da 1ª ocorrência
  data_fim          date not null,
  created_at        timestamptz not null default now(),
  check (data_fim >= data_inicio and data_fim <= (data_inicio + interval '1 month')::date)  -- máx. 1 mês
);

create table torneios (
  id                uuid primary key default gen_random_uuid(),
  loja_id           uuid not null references lojas(id) on delete cascade,
  card_game_id      uuid not null references card_games(id),
  titulo            text not null,
  descricao         text,
  inicio            timestamptz not null,
  fim               timestamptz not null,
  max_jogadores     int not null check (max_jogadores > 0),
  status            torneio_status not null default 'rascunho',
  serie_id          uuid references torneio_series(id) on delete set null,
  serie_data        date,                                -- data local "original" da ocorrência
  serie_editado     boolean not null default false,      -- foi alterada individualmente?
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (fim > inicio),
  unique (serie_id, serie_data)                          -- impede ocorrência duplicada
);
create index on torneios (loja_id, inicio);
```

**Seed inicial de `card_games`** (✅ lista definida por você, na ordem abaixo; editável depois em `/admin/card-games`):

1. Magic: The Gathering
2. Pokémon TCG
3. Pokémon Champions
4. Pokémon GO
5. Yu-Gi-Oh! TCG
6. One Piece Card Game
7. Disney Lorcana
8. Star Wars: Unlimited
9. Digimon Card Game
10. Flesh and Blood
11. Dragon Ball Super Card Game (Fusion World / Masters)
12. Cardfight!! Vanguard
13. Shadowverse: Evolve
14. Weiss Schwarz
15. Grand Archive
16. Altered
17. Battle Scenes
18. KeyForge
19. Riftbound
20. Gundam Card Game
21. Sorcery

Observações sobre a lista:
- Cada jogo recebe uma `cor` no seed, editável no admin. Com 21 jogos, algumas cores ficarão parecidas (principalmente os três Pokémon); por isso o evento no calendário mostra **também o nome/abreviação do jogo**, não só a cor.
- Pokémon Champions e Pokémon GO não são card games físicos, mas entram normalmente: a tabela é só um catálogo de "jogos" de torneio (o nome `card_games` é só convenção).

**Função auxiliar** usada nas policies:

```sql
create function public.minha_loja_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select loja_id from public.loja_usuarios where user_id = (select auth.uid()) $$;
```

Pontos de atenção:
- **Trigger** em `torneios` e `torneio_series`: `card_game_id` precisa estar em `loja_card_games` da loja (valida na criação/edição).
- **Trigger/regra** que bloqueia remover de `loja_card_games` um jogo com torneios futuros.
- Trigger `updated_at` em `torneios`.
- **RPC transacional** `criar_serie(serie jsonb, ocorrencias jsonb)` (`security invoker`, RLS continua valendo): insere a série e todas as ocorrências de uma vez.

### Como funciona a recorrência

**Criação**
1. No formulário, a loja marca "Repetir", escolhe dias da semana, intervalo (toda semana ou a cada 2) e o fim (data **ou** nº de ocorrências), respeitando o teto de **1 mês** a partir da primeira data.
2. O app calcula as datas **no fuso da loja** (`date-fns` + `@date-fns/tz` ou equivalente) e mostra uma **prévia**: cada ocorrência com checkbox e seu alerta (🟡/🔴) ao lado; clicar numa linha abre a agenda daquele dia.
3. A loja desmarca datas que não quer (feriado, loja fechada) e confirma. Só as marcadas são gravadas.
4. Todas nascem com o mesmo status escolhido (`rascunho` ou `publicado`).

Com teto de 1 mês, uma série tem no máximo ~31 ocorrências (todos os dias da semana marcados).

**Edição e exclusão — três escopos** (padrão Google Agenda)

| Escopo | O que acontece |
|---|---|
| **Só esta** | Altera/exclui apenas essa linha; marca `serie_editado = true`. |
| **Esta e as seguintes** | A série é **dividida**: a antiga termina na véspera, nasce uma nova a partir desta data com os valores novos (dentro do `data_fim` original). |
| **Toda a série** | Aplica a mudança a todas as ocorrências da série. |

Ocorrências com `serie_editado = true` são **preservadas** em edições em massa, e o app informa "N ocorrências editadas individualmente foram mantidas". Excluir em massa pede confirmação com a contagem.

**Regras da série**
- A duração de uma ocorrência não pode ser maior que o intervalo entre ocorrências (senão se sobrepõem) → erro **bloqueante**.
- Mudar o horário de funcionamento da loja **não** altera séries existentes; os alertas aparecem nas ocorrências afetadas.
- Para continuar no mês seguinte, cria-se **uma nova série** (atalho "duplicar para o próximo mês" fica pós-MVP).

## 7. Segurança — RLS (Row Level Security)

RLS **ligado em todas as tabelas**. O front usa só a chave pública (publishable/anon).

**`service_role` (só na área `/admin`):**
- Fica em variável **sem** `NEXT_PUBLIC_`, num módulo `lib/supabase/admin.ts` com `import 'server-only'`.
- Toda Server Action/Route do `/admin` **verifica `admins` a cada chamada** (não só no layout).
- Nunca é usada fora do `/admin`; o painel da loja usa apenas o cliente com a sessão do usuário.

| Tabela | Leitura | Escrita |
|---|---|---|
| `lojas` | pública (nome, slug, endereço — necessários à página pública) | UPDATE por usuários da loja, só nas colunas `nome, endereco, capacidade_lugares, timezone` (column grants); INSERT/DELETE e `slug` só admin |
| `loja_usuarios` | usuários da própria loja | só admin |
| `admins` | ninguém (sem policies) | só admin (service_role) |
| `loja_horarios` | pública | usuários da loja |
| `card_games` | pública | só admin |
| `loja_card_games` | usuários da própria loja | usuários da loja |
| `torneio_series` | usuários da loja | usuários da loja |
| `torneios` | `status = 'publicado'` (qualquer pessoa) **ou** loja do usuário | usuários da loja |

Padrão das policies (`(select …)` para o Postgres cachear a chamada):

```sql
create policy "torneios: leitura" on torneios for select using (
  status = 'publicado' or loja_id = (select public.minha_loja_id())
);
create policy "torneios: escrita" on torneios for all
  using      (loja_id = (select public.minha_loja_id()))
  with check (loja_id = (select public.minha_loja_id()));
```

Com signup público desligado, só quem você convida chega a ter `auth.uid()`.

## 8. Regras de negócio

1. `fim > inicio` (também garantido por `check` no banco).
2. Card game do torneio deve estar entre os que a loja atua.
3. Alertas (nunca bloqueiam) — detalhados na seção 9.
4. Todos os torneios da loja entram nos alertas, rascunhos inclusos.
5. Torneio que atravessa a meia-noite aparece na agenda dos **dois** dias e é checado dia a dia contra o horário de funcionamento.
6. Para séries, a mesma função roda **por ocorrência**; a prévia mostra "X de N ocorrências com alerta".
7. Público só enxerga `publicado`; despublicar some imediatamente da página pública.
8. Excluir torneio ou série pede confirmação.

## 9. Alertas e "Agenda do dia"

### Níveis de alerta (✅ orientados pela capacidade)

| Situação | Alerta |
|---|---|
| Horários se sobrepõem a outro torneio **e o pico de ocupação excede** `capacidade_lugares` | 🔴 **Vermelho** — ex.: *"Capacidade excedida: 52/40 lugares entre 19:00 e 23:00"* |
| Horários se sobrepõem, mas o pico **cabe** na capacidade | **Nenhum alerta** (a linha aparece na agenda do dia com a ocupação somada, ex.: *30/40*) |
| Outro torneio no mesmo dia, **sem** sobreposição de horário | **Nenhum alerta** (aparece na agenda do dia) |
| Torneio (ou parte dele) **fora do horário de funcionamento** da loja naquele dia | 🟡 **Amarelo** |

Vermelho prevalece sobre amarelo quando os dois ocorrem. Alertas são informativos: o botão salvar continua ativo.

Cálculo do pico de ocupação: nos instantes `{início do novo} ∪ {início de cada torneio sobreposto dentro da janela}`, somar `max_jogadores` dos torneios ativos no instante + o novo, e tomar o maior valor. (Somar tudo geraria falso alarme quando A e B se sobrepõem ao novo mas não entre si.)

### Agenda do dia (painel lateral)

Aparece **ao lado** do formulário de torneio e ao clicar em um dia no calendário. Mostra, para a data escolhida:

- Cabeçalho: dia da semana + **horário de funcionamento** da loja ("Aberta 14:00–22:00" ou "Fechada").
- Lista, ordenada por horário, de **todos os torneios já criados naquele dia**:
  `19:00–23:00 · ● Magic · Friday Night Magic · 24/40 · Publicado`
- Cada linha com a cor do card game e selo de status (rascunho/publicado).
- **Atualiza ao vivo** conforme a loja altera data/hora no formulário: as linhas que se sobrepõem ao horário digitado são destacadas e mostram a **ocupação somada** (ex.: *30/40*); ficam em 🔴 só se o pico exceder a capacidade.
- Alerta de resumo no topo do formulário **apenas quando há 🔴 ou 🟡** (ex.: "Capacidade excedida: 52/40 lugares entre 19:00 e 23:00 — Friday Night Magic").

## 10. Telas e rotas

| Rota | Tela |
|---|---|
| `/login`, `/recuperar-senha` | Autenticação (sem cadastro público) |
| `/auth/confirm` | Valida o token do e-mail (convite/recuperação) |
| `/definir-senha` | Primeira senha (convite) ou nova senha (recuperação) |
| `/sem-loja` | Conta sem vínculo com loja |
| `/admin` | Atalhos (somente admin) |
| `/admin/lojas`, `/admin/lojas/novo` | Lista e cadastro de lojas |
| `/admin/lojas/[id]` | Dados da loja + **usuários da loja** (convidar, reenviar convite, remover) |
| `/admin/card-games` | CRUD da tabela global de card games |
| `/painel` | Resumo: próximos torneios, rascunhos pendentes, alertas |
| `/painel/calendario` | **Calendário** mês/semana/dia + agenda do dia ao clicar |
| `/painel/torneios` | Lista/tabela com filtros e ações |
| `/painel/torneios/novo`, `/[id]` | Formulário + **agenda do dia ao lado** + seção "Repetir" |
| `/painel/torneios/serie/preview` | Prévia das ocorrências com checkboxes e alertas |
| `/painel/parametros` | **Parâmetros da loja:** dados, capacidade, horários, **card games em que atua**, usuários (leitura) |
| `/l/[slug]` | Calendário público (só publicados) |

Calendário: **FullCalendar** (daygrid + timegrid, locale pt-BR). Cor do evento = cor do card game; rascunhos tracejados/translúcidos; ocorrências de série com ícone de repetição; eventos com alerta têm marcador 🟡/🔴.

## 11. Stack, estrutura e estratégia sem testes locais

**Stack:** Next.js (App Router) · TypeScript · Tailwind + shadcn/ui (tema neutro, cores em variáveis CSS) · `@supabase/ssr` + `@supabase/supabase-js` · FullCalendar · Zod · `date-fns` + `@date-fns/tz` · Vitest (só no CI).

**Estrutura sugerida:**

```
src/
  app/
    (auth)/login, recuperar-senha, definir-senha, sem-loja
    auth/confirm/route.ts
    admin/...                  # somente admin (service_role no servidor)
    (painel)/painel/...        # protegido (usuário vinculado a loja)
    l/[slug]/                  # público
  lib/
    supabase/{client,server,proxy,admin}.ts   # admin.ts = server-only
    conflitos/                 # alertas 🟡/🔴 + pico de capacidade + testes
    recorrencia/               # geração de ocorrências + divisão de série + testes
    schemas/                   # Zod
  components/
supabase/
  migrations/                  # SQL versionado (schema + RLS + triggers + RPC + seed)
.github/workflows/ci.yml       # lint + typecheck + vitest + build
```

**Autenticação no Next:** sessão em cookies via `@supabase/ssr`; `proxy`/middleware renova o token e redireciona `/painel/*` para `/login` sem sessão, e para `/sem-loja` sem vínculo. Validar usuário no servidor com `supabase.auth.getUser()`, não só `getSession()`.

**Como validar sem rodar nada local:**

| Camada | Onde roda |
|---|---|
| Typecheck + lint + build | Build da Vercel e GitHub Actions |
| Testes unitários (alertas, recorrência, fuso/horário) | GitHub Actions (Vitest) |
| Fluxo real (convite, login, CRUD, calendário, série, admin) | **Preview Deployment** da Vercel apontando para o Supabase |
| Migrations / RLS | Aplicadas no SQL Editor (ou CLI) do projeto Supabase hospedado |

Alertas e recorrência são a parte mais propensa a bug; por serem funções puras concentram a cobertura de testes no CI (virada de meia-noite, intervalo quinzenal, múltiplos dias da semana, teto de 1 mês, sobreposição que cabe vs. que excede a capacidade, mesmo dia sem sobreposição, fora do horário, "esta e as seguintes").

Sugestão: **dois projetos Supabase** — `dev` (previews) e `prod` — com variáveis por ambiente na Vercel. Pode começar com um só, mas separe antes de ter dados reais.

**Variáveis de ambiente (Vercel):**
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `..._ANON_KEY`, conforme o painel mostrar), `NEXT_PUBLIC_SITE_URL`.
- `SUPABASE_SERVICE_ROLE_KEY` — **só servidor**, sem prefixo `NEXT_PUBLIC_`, usada apenas no `/admin`.

## 12. Roadmap

**Etapa 0 — Fundação** *(passo a passo manual no [README](README.md))*
- [x] Scaffold Next.js 16 + Tailwind 4 + shadcn (tema neutro), escrito sem rodar nada local.
- [x] CI no GitHub Actions (lint, testes, build, tipos) + workflow manual para gerar o `package-lock.json`.
- [x] Clientes Supabase (browser/server), proxy de sessão com proteção de `/painel` e `/admin`, cliente `service_role` server-only.
- [ ] **Você:** criar projeto(s) no Supabase; e-mail/senha ligado, **signups públicos desligados**, template de convite ajustado.
- [ ] **Você:** importar o repositório na Vercel e configurar as variáveis (incluindo `SUPABASE_SERVICE_ROLE_KEY`).
- [ ] **Você:** criar seu usuário no Supabase (*Add user*). O `insert` em `admins` é feito na Etapa 1, depois da migration inicial (a tabela ainda não existe).
- [ ] **Você:** rodar o workflow *Gerar package-lock* no GitHub e conferir o CI verde.

**Etapa 1 — Acesso, admin e parâmetros**
- [ ] Migration inicial: tabelas, RLS, triggers, função `minha_loja_id`, seed de card games.
- [ ] Fluxo de convite (`/auth/confirm`, `/definir-senha`), login, recuperação, proteção de rotas, `/sem-loja`.
- [ ] Área `/admin`: lojas, usuários por loja (convidar/reenviar/remover), CRUD de card games.
- [ ] `/painel/parametros`: dados, capacidade, horários, card games da loja.

**Etapa 2 — Torneios avulsos**
- [ ] CRUD de torneios com status e validação Zod (card game restrito aos da loja).
- [ ] Lista com filtros e ações rápidas.

**Etapa 3 — Calendário, agenda do dia e alertas**
- [ ] Funções de alerta 🟡/🔴 + pico de capacidade, com testes no CI.
- [ ] Painel "Agenda do dia" ao lado do formulário, atualizando ao vivo.
- [ ] Calendário mês/semana/dia com cores e filtros; clique no dia abre a agenda.

**Etapa 4 — Recorrência (1 mês)**
- [ ] Geração de ocorrências no fuso da loja, com testes no CI.
- [ ] Seção "Repetir" + prévia com checkboxes e alertas por ocorrência.
- [ ] RPC `criar_serie` transacional.
- [ ] Edição/exclusão por escopo (só esta / esta e seguintes / toda a série).

**Etapa 5 — Público e acabamento**
- [ ] Página pública `/l/[slug]`.
- [ ] Responsivo (cadastro pelo celular no balcão), estados vazios, mensagens em pt-BR.
- [ ] Deploy de produção.

**Pós-MVP:** duplicar série p/ próximo mês → arrastar no calendário → papéis na loja → inscrições → notificações.

## 13. Perguntas em aberto

*(Área admin, permissões iguais, regra de capacidade e lista de card games já foram decididos — ver seção 2.)*

1. **Torneio no mesmo dia, sem sobreposição de horário:** entendi que **não gera alerta** (só aparece na agenda do dia), já que o 🟡 ficou apenas para "fora do horário de funcionamento". Se quiser um 🟡 também para "já existe outro torneio nesse dia", me avise.
