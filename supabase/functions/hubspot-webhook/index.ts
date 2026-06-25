import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const TARGET_STAGE = "1036112429";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const events = Array.isArray(payload) ? payload : [payload];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let created = 0;
    for (const event of events) {
      if (
        event?.propertyName === "dealstage" &&
        String(event?.propertyValue) === TARGET_STAGE &&
        event?.objectId != null
      ) {
        const dealId = String(event.objectId);

        const { data: existing } = await supabase
          .from("instalaciones")
          .select("id")
          .eq("deal_id", dealId)
          .maybeSingle();

        if (existing) continue;

        const { error } = await supabase.from("instalaciones").insert({
          deal_id: dealId,
          hito_actual: 0,
          hitos_completados: [],
          eventos: [
            {
              hito: null,
              accion: "creado",
              email: "hubspot-trigger",
              timestamp: new Date().toISOString(),
            },
          ],
        });
        if (error) {
          console.error("insert error", dealId, error);
          continue;
        }
        created++;
      }
    }

    return new Response(JSON.stringify({ ok: true, created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("webhook error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // siempre 200 para que HubSpot no reintente en loop
    });
  }
});
