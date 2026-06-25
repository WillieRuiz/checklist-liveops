// Edge Function: send-notification
// Deploy with: supabase functions deploy send-notification --no-verify-jwt
// Set secret:  supabase secrets set RESEND_API_KEY=re_xxx
//
// Body: { type: 'comment_to_teacher' | 'reply_to_student', moduleTitle, moduleUrl, recipientEmail, authorName }

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = "Niko Onboarding <onboarding@resend.dev>";

function buildEmail(opts: {
  type: "comment_to_teacher" | "reply_to_student";
  moduleTitle: string;
  moduleUrl: string;
  authorName: string;
}) {
  const { type, moduleTitle, moduleUrl, authorName } = opts;

  const isStudent = type === "comment_to_teacher";
  const subject = isStudent
    ? `💬 Dayanna tiene una duda en ${moduleTitle}`
    : `✅ ${authorName} respondió tu duda en ${moduleTitle}`;

  const heading = isStudent
    ? "Dayanna dejó una pregunta"
    : `${authorName} respondió tu duda`;

  const body = isStudent
    ? `Dayanna dejó una pregunta en el módulo <strong>"${moduleTitle}"</strong>. Entra a responder:`
    : `${authorName} respondió en el módulo <strong>"${moduleTitle}"</strong>. Entra a ver la respuesta:`;

  const cta = isStudent ? "Responder pregunta" : "Ver respuesta";

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,Arial,sans-serif;color:#000;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:#000000;padding:24px 32px;">
          <div style="display:inline-block;background:#FFE600;padding:8px 14px;border-radius:8px;font-weight:900;font-size:18px;letter-spacing:-0.5px;color:#000;">N Niko</div>
          <span style="color:#fff;margin-left:14px;font-size:13px;opacity:0.7;letter-spacing:0.5px;text-transform:uppercase;">Onboarding of Customer Success</span>
        </td></tr>
        <tr><td style="padding:40px 32px 24px;">
          <h1 style="margin:0 0 16px;font-size:26px;font-weight:800;line-height:1.2;letter-spacing:-0.5px;">${heading}</h1>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#333;">${body}</p>
          <a href="${moduleUrl}" style="display:inline-block;background:#FFE600;color:#000;padding:14px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:15px;">${cta}</a>
        </td></tr>
        <tr><td style="padding:24px 32px 32px;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#888;line-height:1.5;">Niko Energy — Plataforma interna de onboarding</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const { type, moduleTitle, moduleUrl, recipientEmail, authorName } = await req.json();

    if (!type || !moduleTitle || !moduleUrl || !recipientEmail) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = buildEmail({ type, moduleTitle, moduleUrl, authorName: authorName || "Tu mentor" });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [recipientEmail],
        subject,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", data);
      return new Response(JSON.stringify({ error: data }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("send-notification error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
