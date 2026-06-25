import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Body = {
  dealId?: string
  clienteNombre?: string | null
  hito?: string
  blocker?: string
  direccion?: string | null
  rpu?: string | null
  kind?: 'warning' | 'stop'
}

function escapeSlack(v: unknown): string {
  if (v == null || v === '') return '—'
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildText(b: Required<Pick<Body, 'dealId' | 'hito' | 'blocker'>> & Body, email: string) {
  const hora = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date())
  const isStop = b.kind === 'stop'
  const header = isStop
    ? `<!channel> 🚨 *Paro de obra*`
    : `<!channel> ⚠️ *Fricción en instalación*`
  const problemLabel = isStop ? 'Problema' : 'Situación'
  const estado = isStop
    ? 'Requiere escalación inmediata'
    : 'En gestión — no requiere escalación aún'
  return [
    header,
    `*Deal:* ${escapeSlack(b.dealId)} · ${escapeSlack(b.clienteNombre)}`,
    `*Hito:* ${escapeSlack(b.hito)}`,
    `*${problemLabel}:* ${escapeSlack(b.blocker)}`,
    `*Dirección:* ${escapeSlack(b.direccion)}`,
    `*RPU:* ${escapeSlack(b.rpu)}`,
    `*Reporta:* ${escapeSlack(email)}`,
    `*Hora:* ${hora}`,
    `*Estado:* ${estado}`,
  ].join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const webhook = Deno.env.get('SLACK_WEBHOOK_URL')
  console.log('slack_webhook_present', !!webhook, 'len', webhook?.length ?? 0)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) {
      console.log('claims_error', claimsErr?.message)
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const email = (claimsData.claims as any).email ?? 'desconocido'

    const body = (await req.json()) as Body
    if (!body.dealId || !body.hito || !body.blocker) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const text = buildText(body as any, email)
    console.log('posting_to_slack', { dealId: body.dealId, hito: body.hito, blocker: body.blocker })

    if (!webhook) {
      return new Response(
        JSON.stringify({ ok: false, text, error: 'SLACK_WEBHOOK_URL not set' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let slackRes: Response
    try {
      slackRes = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log('slack_fetch_threw', msg)
      return new Response(
        JSON.stringify({ ok: false, text, error: `Fetch failed: ${msg}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const slackBody = await slackRes.text()
    console.log('slack_response', slackRes.status, slackBody.slice(0, 500))

    if (!slackRes.ok || slackBody !== 'ok') {
      return new Response(
        JSON.stringify({
          ok: false,
          text,
          error: `Slack ${slackRes.status}: ${slackBody.slice(0, 200)}`,
          slack_status: slackRes.status,
          slack_body: slackBody.slice(0, 500),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(JSON.stringify({ ok: true, text }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.log('handler_threw', msg)
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
