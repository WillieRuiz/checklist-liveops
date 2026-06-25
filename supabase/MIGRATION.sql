-- =====================================================================
-- NIKO ONBOARDING - DATABASE MIGRATION
-- Run this in Supabase SQL Editor (Project: gmopwuhqtlpiffuidsbr)
-- =====================================================================

-- 1. ENUMS
do $$ begin
  create type public.app_role as enum ('student', 'teacher');
exception when duplicate_object then null; end $$;

-- 2. PROFILES (mirrors auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- 3. USER ROLES (separate table per security best practices)
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique(user_id, role)
);

-- 4. MODULES
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  day text not null,                      -- '1' | '2' | '3' | '4' | '5' | 'week2'
  "order" int not null,                   -- ordering within app
  title text not null,
  description text,
  content text not null,                  -- markdown
  teacher_email text not null,
  is_approved boolean default false,
  approved_at timestamptz,
  approved_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. COMMENTS
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  parent_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz default now()
);

-- 6. COMPLETIONS
create table if not exists public.completions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  completed_at timestamptz default now(),
  unique(module_id, user_id)
);

-- =====================================================================
-- 7. SECURITY DEFINER ROLE CHECK
-- =====================================================================
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

create or replace function public.get_my_role()
returns app_role
language sql stable security definer set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid() limit 1;
$$;

-- =====================================================================
-- 8. AUTO-PROVISION PROFILE + ROLE ON SIGNUP
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  assigned_role app_role;
begin
  -- Block non-niko emails entirely
  if new.email not like '%@niko.mx' then
    raise exception 'Solo cuentas @niko.mx pueden acceder';
  end if;

  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set name = excluded.name, avatar_url = excluded.avatar_url;

  -- Role mapping
  assigned_role := case
    when new.email = 'dayanna.gandara@niko.mx' then 'student'::app_role
    else 'teacher'::app_role
  end;

  insert into public.user_roles (user_id, role)
  values (new.id, assigned_role)
  on conflict do nothing;

  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 9. RLS
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.modules enable row level security;
alter table public.comments enable row level security;
alter table public.completions enable row level security;

-- profiles: everyone authenticated can read; users update own
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id);

-- user_roles: read own + read all (needed to render teacher names)
drop policy if exists "roles read all" on public.user_roles;
create policy "roles read all" on public.user_roles for select to authenticated using (true);

-- modules: everyone reads; only assigned teacher updates
drop policy if exists "modules read" on public.modules;
create policy "modules read" on public.modules for select to authenticated using (true);
drop policy if exists "modules update by teacher" on public.modules;
create policy "modules update by teacher" on public.modules for update to authenticated
  using (teacher_email = (select email from public.profiles where id = auth.uid()));

-- comments: everyone reads; users insert their own; users delete their own
drop policy if exists "comments read" on public.comments;
create policy "comments read" on public.comments for select to authenticated using (true);
drop policy if exists "comments insert own" on public.comments;
create policy "comments insert own" on public.comments for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "comments delete own" on public.comments;
create policy "comments delete own" on public.comments for delete to authenticated using (auth.uid() = user_id);

-- completions: students manage own; everyone reads
drop policy if exists "completions read" on public.completions;
create policy "completions read" on public.completions for select to authenticated using (true);
drop policy if exists "completions insert own" on public.completions;
create policy "completions insert own" on public.completions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "completions delete own" on public.completions;
create policy "completions delete own" on public.completions for delete to authenticated using (auth.uid() = user_id);

-- =====================================================================
-- 10. SEED MODULES (28 total)
-- =====================================================================
truncate public.modules cascade;

insert into public.modules (day, "order", title, teacher_email, content) values
('1', 1, 'Tus accesos', 'luisen.moro@niko.mx',
$md$Checklist completo del setup que necesitas para arrancar.

| Herramienta | Quién da acceso | Cómo pedirlo |
|---|---|---|
| Slack | Federico Vélez | Confirmar cuenta activa y canales principales de soporte |
| HubSpot | Cristina Beltrán (cristina@niko.mx) | Pedir acceso por Slack en #pedidos-data-producto-tech-2026 |
| Gmail | People Ops | Configurar firma corporativa |
| NocoDB | Federico Vélez | Solicitar directamente |
| Sunvoy | Cristina Beltrán | Pedir acceso por Slack en #pedidos-data-producto-tech-2026 |
| Chatwoot | Federico Vélez | Solicitar directamente |
| WhatsApp Business | Luisen Moro | Solicitar teléfono físico — es tu canal temporal de comunicación con clientes |
| Calendario de visitas | — | Entrar directo: https://calendario-operaciones.lovable.app/ |
$md$),

('1', 2, '¿Qué es un Deal ID?', 'luisen.moro@niko.mx',
$md$En Niko cada cliente tiene un número único que lo identifica en todas las herramientas: HubSpot, NocoDB, Drive. Ese número se llama **Deal ID**.

Con él puedes:
- Buscarlo en HubSpot
- Encontrarlo en NocoDB
- Ubicar su carpeta en Drive
- Referenciarlo en cualquier ticket

> **Deal ID = cédula del cliente en Niko.**

Sesión práctica con Luisen.$md$),

('1', 3, '¿Qué es un Pipeline?', 'luisen.moro@niko.mx',
$md$Un **pipeline** en HubSpot es una secuencia de etapas que representa el camino que recorre un cliente desde que firma con Niko hasta que se convierte en cliente establecido.

**Pipelines principales:**
- 1.1 Sales
- 1.2 Sales to CS Handoff
- 1.3 CS to Ops CW
- 1.4 CS Installed Clients
- 1.5 Churn

Tu mundo como APX empieza en **Established Clients (1.55)**.

Sesión con Luisen.$md$),

('1', 4, '¿Qué es un Stage?', 'luisen.moro@niko.mx',
$md$Dentro de cada pipeline hay **stages** — paradas específicas del camino con nombre, número y responsable.

**Los stages que te importan en NocoDB:**
- Etapa 1 (CW to IX) — Customer Support
- Etapa 2 (Estabilización) — Customer Support
- Etapa 3 (Producción/Established) — **este es tu cliente**

Sesión con Luisen.$md$),

('2', 5, '¿Qué es APX y O&M?', 'luisen.moro@niko.mx',
$md$**APX (Asset Performance Experience)** es el equipo responsable de la relación post-instalación. Internamente también se llama **O&M**.

Tu cliente es quien ya tiene sistema instalado e interconectado y llegó a **Established Clients (1.55)**.

Tu trabajo tiene 3 ejes:
1. **Retención**
2. **Soporte especializado**
3. **Crecimiento de cuenta**

Sesión con Luisen.$md$),

('2', 6, 'Tipos de cliente', 'luisen.moro@niko.mx',
$md$| Tipo | Descripción |
|---|---|
| **Plata** | Cliente residencial estándar |
| **Gold** | Cliente multisitio, enterprise o relacionado con ese segmento |
| **Black** | Cliente VIP de alta prioridad — atención preferencial e inmediata. Un cliente Black nunca espera |

Sesión con Luisen.$md$),

('2', 7, 'Quién es quién en Niko', 'luisen.moro@niko.mx',
$md$| Equipo | Qué hacen | Cuándo los contactas |
|---|---|---|
| Billing | Gestión de pagos | Cuando cliente tiene problemas con su pago — tú eres el intermediario |
| Quoting | Cotizaciones y precios | Cuando identificas un upsell — todo precio pasa por ellos |
| IX | Trámites CFE | Cuando cliente establecido tiene problema con medidor bidireccional |
| Construcción e Ingeniería | Instalaciones y validaciones | Vía O&M. También para garantías de construcción |
| Calidad | Garantías de instalación | Para garantías de construcción — junto con Michelangelo |
| Project Management | Planeación | Rara vez — solo debes saber quiénes son |
| Procurement | Compras y piezas | Para estatus de piezas del sistema en mantenimientos |
| Product | Software y herramientas | Cuando detectas un bug o necesitas mejora en alguna herramienta |
| Customer Support | Instalación e IX (1.22–1.54) | Cuando tema del cliente viene de su proceso anterior |

Sesión con Luisen.$md$),

('3', 8, '¿Qué es un Hand-off?', 'luisen.moro@niko.mx',
$md$El **hand-off** es una reunión interna donde Ingeniería, Quoting e IX le entregan formalmente un proyecto a Customer Support para llevarlo con Construcción.

Marca el inicio de la responsabilidad de Customer Support. Como APX no participas pero **debes entenderlo** porque los clientes te mencionarán cosas de su proceso anterior.

Sesión con Luisen.$md$),

('3', 9, '¿Qué es una Llamada de Onboarding?', 'luisen.moro@niko.mx',
$md$Ocurre **después del hand-off**. Customer Support recibe al cliente, alinea expectativas, explica qué va a pasar y en qué tiempos. Se genera un documento personalizado.

Esto evita que el cliente llegue a APX con expectativas incorrectas.

Lo ejecuta Customer Support — tú lo recibes como contexto.

Sesión con Luisen.$md$),

('3', 10, '¿Qué hace Customer Support?', 'luisen.moro@niko.mx',
$md$Customer Support lleva al cliente desde que firma hasta Established Client. Su pipeline va del **stage 1.22 al 1.54** — todo el proceso de instalación e interconexión.

Cuando el cliente llega a **1.55 Established Clients**, Customer Support termina y APX toma la relación.

> **Distinción clave:** Customer Support = instalación e IX. APX = vida post-instalación.

Sesión con Luisen.$md$),

('3', 11, 'Comunicación con clientes: WhatsApp', 'luisen.moro@niko.mx',
$md$**WhatsApp Business** es tu canal temporal de comunicación directa. Tienes un teléfono físico asignado.

Es temporal porque el canal oficial es **Chatwoot**.

> **Regla de oro:** toda conversación relevante debe quedar documentada en NocoDB o HubSpot aunque haya empezado por WhatsApp.

Sesión con Luisen.$md$),

('3', 12, 'Cómo subir un ticket a O&M', 'alyssa@niko.mx',
$md$Cuando un cliente necesita atención técnica se genera un **ticket en O&M**.

Alyssa te muestra el flujo completo:
- Dónde se levanta
- Qué información se necesita
- Cómo se da seguimiento
- Cómo se cierra

Sesión con Alyssa.$md$),

('3', 13, '¿Qué es un análisis de recibo?', 'alyssa@niko.mx',
$md$Es la revisión del recibo de CFE de un cliente comparado con su consumo y generación real del sistema solar.

Actualmente Alyssa los realiza. El objetivo es explicarle al cliente **por qué** su recibo dice lo que dice — si está ahorrando lo esperado, si hay anomalía, o si su consumo cambió.

Es una de las herramientas más importantes para demostrar el valor del sistema y retener al cliente.

Sesión con Alyssa.$md$),

('3', 14, '¿Qué es una visita técnica?', 'michelangelo.perea@niko.mx',
$md$Una **visita técnica** es una intervención presencial en las instalaciones del cliente. Puede ser:
- **Preventiva** (revisión general)
- **Correctiva** (atender una falla)

Michelangelo te explica:
- Cómo se agenda
- Qué información necesitas tener lista
- Qué pasa durante la visita
- Qué entregable recibe el cliente al final

Sesión con Michelangelo.$md$),

('3', 15, 'Comunicación con clientes: Chatwoot', 'federico.velez@niko.mx',
$md$**Chatwoot** es la plataforma centralizada donde llegan las conversaciones de clientes vía el bot de IA (tier 1). Lo que el bot no puede resolver se escala a ti.

Fede te muestra:
- Cómo funciona la bandeja compartida
- Cómo identificar tus tickets
- Cómo responder
- Cómo documentar cada caso

Sesión con Fede.$md$),

('4', 16, '¿Qué es un Upsell?', 'denisse@niko.mx',
$md$Un **upsell** es una venta incremental sobre un proyecto existente.

**Tipos que puedes ofrecer:**
- Ampliación de paneles
- Baterías
- Visitas técnicas adicionales
- Limpiezas
- Niko Care
- Obra civil
- Reubicación de paneles
- Niko Insurance

**Dos rutas:**
- **Contado** (directo a propuesta)
- **Financiamiento** (pasa por validación de crédito)

**Reglas:**
- Crear como New Deal
- Nunca clonar
- Formato de nombre: `Upsell – [Deal padre] – [Tipo]`

Sesión con Denisse.$md$),

('4', 17, 'Quoting en un Upsell', 'samuel.vargas@niko.mx',
$md$**Quoting define el precio final** de cualquier upsell — ninguna propuesta llega al cliente sin pasar por ellos.

**Tu rol:**
1. Detectar la oportunidad
2. Crear el deal en HubSpot con la información correcta
3. Moverlo a **Prefactibilidad y Dimensionamiento** — ese movimiento detona la solicitud a Quoting

Si el upsell no es viable, Quoting te lo regresa y el deal se cierra como perdido.

Sesión con Samuel.$md$),

('4', 18, '¿Qué es Niko Care?', 'alyssa@niko.mx',
$md$**Niko Care** es una suscripción para clientes instalados e interconectados.

**Incluye:**
- Una limpieza al año
- Una visita de diagnóstico al año
- Monitoreo 24/7

**Aplica a:** Contado, MSI, clientes que finalizaron arrendamiento.

**Tarifas:**

| Paneles | Mensualidad | Anualidad (-15%) |
|---|---|---|
| 1-30 | $627 + IVA | $6,550 + IVA |
| 31-70 | $807 + IVA | $8,420 + IVA |
| 71-100 | $1,009 + IVA | $10,525 + IVA |
| 101-150 | $1,402 + IVA | $14,630 + IVA |
| 151-250 | $1,742 + IVA | $18,187 + IVA |

**Descuentos con Niko Care:**
- Limpiezas adicionales $290+IVA/panel (sin NC: $399)
- Visitas adicionales 15% dto
- Mantenimientos 10% dto

Sesión con Alyssa.$md$),

('4', 19, 'Sunvoy: monitoreo solar', 'alyssa@niko.mx',
$md$**Sunvoy** es la plataforma de monitoreo de cada sistema fotovoltaico instalado por Niko. También es donde está hosteada la **Niko App**.

Lo usas para revisar producción y generación — especialmente cuando un cliente reporta que su sistema no funciona bien o cuando el análisis de recibo muestra algo anómalo.

Alyssa te muestra:
- Cómo navegar
- Buscar cliente por Deal ID
- Qué datos son más relevantes

Acceso vía Cristina Beltrán.$md$),

('5', 20, 'NocoDB: tus vistas', 'luisen.moro@niko.mx',
$md$Vives en la tabla **clients** dentro del base **Getting Started**. Fede configura tus vistas personales.

**Tu vista personal** filtrada a tus clientes (CS Owner = Dayanna).

**Agrupación por Etapa del Cliente:** Etapa 1, 2, 3. Tu foco es **Established Clients**.

**Agrupación por Tipo:** Plata, Gold, Black — los **Black son prioridad máxima**.

**Campos clave:**
- Deal name
- Deal ID
- hs_url (link a HubSpot)
- CS Owner
- Etapa del cliente
- Proceso CS

Tus tickets también viven en NocoDB. Acceso con Fede. Sesión con Luisen.$md$),

('5', 21, 'HubSpot: navegar un deal', 'luisen.moro@niko.mx',
$md$**HubSpot** es el CRM donde vive toda la historia comercial de cada cliente. Como CSM de APX lo usas principalmente para **consultar**.

**Debes saber:**
- Buscar cliente por Deal ID o nombre
- Leer pipeline, stage actual, tipo de negocio e historial de notas
- Identificar producto financiero (Suscripción, MSI, Contado) — determina qué garantías y upsells aplican
- Dejar notas documentando interacciones relevantes

Sesión con Luisen.$md$),

('5', 22, 'SOPs prioritarios', 'luisen.moro@niko.mx',
$md$Lee estos SOPs antes de terminar tu primera semana. **No los memorices — entiende el flujo general.**

1. **SOP Gestión de Solicitudes de Soporte** — tu proceso base de trabajo
2. **SOP Preguntas que requieren escalar a nivel 2** — situaciones que no debes resolver tú
3. **SOP Limpieza de Paneles Solares** — para explicar y ofrecer como upsell
4. **Proceso de Ampliaciones (Upsells)** — procedimiento operativo completo
5. **SOP Generación de Póliza AXA-GNP** — para cuando cliente pregunte por su seguro
6. **FAQ NIKO** — preguntas frecuentes de clientes, léela completa

> Lectura individual — sin sesión.$md$),

('week2', 23, 'Shadow: Luisen', 'luisen.moro@niko.mx',
$md$Acompaña a Luisen en su trabajo real.

**Observa:**
- Atención de tickets reales
- Escalaciones internas
- Comunicación con clientes vía WhatsApp

Trae tus dudas de los **módulos 2, 3, 4, 8, 9, 10, 11, 20, 21**.

Agenda flexible según disponibilidad.$md$),

('week2', 24, 'Shadow: Michelangelo', 'michelangelo.perea@niko.mx',
$md$Acompaña a Michelangelo en field ops.

**Observa:** coordinación y ejecución de visitas técnicas en tiempo real.

Trae tus dudas del **módulo 14**.

Agenda flexible.$md$),

('week2', 25, 'Shadow: Alyssa', 'alyssa@niko.mx',
$md$Acompaña a Alyssa en su trabajo diario.

**Observa:**
- Análisis de recibos CFE
- Monitoreo de sistemas en Sunvoy

Trae tus dudas de los **módulos 12, 13, 18, 19**.

Agenda flexible.$md$),

('week2', 26, 'Shadow: Fede', 'federico.velez@niko.mx',
$md$Acompaña a Fede.

**Observa:**
- Operación de Chatwoot
- Gestión del bot
- Escalaciones tier 1 → tier 2

Trae tus dudas del **módulo 15**.

Agenda flexible.$md$),

('week2', 27, 'Shadow: Denisse', 'denisse@niko.mx',
$md$Acompaña a Denisse.

**Observa:** proceso de upsell con cliente real — desde la detección hasta la propuesta.

Trae tus dudas del **módulo 16**.

Agenda flexible.$md$),

('week2', 28, 'Shadow: Samuel', 'samuel.vargas@niko.mx',
$md$Acompaña a Samuel.

**Observa:** cómo trabaja Quoting en un upsell real — prefactibilidad, dimensionamiento y precio final.

Trae tus dudas del **módulo 17**.

Agenda flexible.$md$);

-- Done!
