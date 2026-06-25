import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dealId = String(body?.dealId ?? "").trim();
    if (!dealId) {
      return new Response(JSON.stringify({ error: "dealId requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("HUBSPOT_TOKEN");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "HUBSPOT_TOKEN no configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://api.hubapi.com/crm/v3/objects/deals/${encodeURIComponent(
      dealId,
    )}?properties=dealname,project_address,numero_de_servicio_cfe`;

    const hsRes = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (hsRes.status === 404) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!hsRes.ok) {
      const text = await hsRes.text();
      console.error("HubSpot error", hsRes.status, text);
      return new Response(
        JSON.stringify({ error: "hubspot_error", status: hsRes.status, detail: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const json = await hsRes.json();
    const p = json.properties ?? {};
    return new Response(
      JSON.stringify({
        dealname: p.dealname ?? null,
        project_address: p.project_address ?? null,
        numero_de_servicio_cfe: p.numero_de_servicio_cfe ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("hubspot-deal error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
