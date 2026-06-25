/**
 * get-checklist
 *
 * Lee la hoja "Checklist Commissioning" de Google Sheets usando la service account
 * y devuelve los items como JSON: [{ hito, concepto, check }]
 *
 * Supabase secrets requeridos:
 *   SPREADSHEET_ID          — ID del spreadsheet de Google Sheets
 *   GOOGLE_CREDENTIALS_JSON — Contenido completo del archivo credentials.JSON
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// Base64url helper
// ---------------------------------------------------------------------------

function toBase64url(data: string | Uint8Array): string {
  let raw: string;
  if (typeof data === "string") {
    raw = btoa(unescape(encodeURIComponent(data)));
  } else {
    raw = btoa(String.fromCharCode(...data));
  }
  return raw.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// ---------------------------------------------------------------------------
// Google OAuth2 — intercambia JWT por access token
// ---------------------------------------------------------------------------

interface ServiceAccount {
  client_email: string;
  private_key:  string;
}

async function getGoogleAccessToken(cred: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header  = toBase64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = toBase64url(
    JSON.stringify({
      iss:  cred.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud:  "https://oauth2.googleapis.com/token",
      exp:  now + 3600,
      iat:  now,
    }),
  );

  const sigInput = `${header}.${payload}`;

  // Importar clave privada PKCS#8 PEM
  const pemBody = cred.private_key
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sigBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(sigInput),
  );

  const jwt = `${sigInput}.${toBase64url(new Uint8Array(sigBytes))}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Google token error: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

// ---------------------------------------------------------------------------
// Leer Google Sheets y parsear checklist
// ---------------------------------------------------------------------------

async function readChecklist(spreadsheetId: string, accessToken: string) {
  const range = encodeURIComponent("Checklist Commissioning");
  const url   = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Sheets API error ${res.status}: ${txt}`);
  }

  const { values } = await res.json() as { values: string[][] };
  if (!values?.length) return [];

  // Forward-fill Hito y Concepto (igual que el Python original)
  let lastHito = "", lastConcepto = "";
  const items: { hito: string; concepto: string; check: string }[] = [];

  for (const row of values.slice(1)) { // skip header
    const hito     = row[0]?.trim() || lastHito;
    const concepto = row[1]?.trim() || lastConcepto;
    const check    = row[2]?.trim() ?? "";

    if (check) items.push({ hito, concepto, check });
    if (row[0]?.trim()) lastHito     = row[0].trim();
    if (row[1]?.trim()) lastConcepto = row[1].trim();
  }

  return items;
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const spreadsheetId = Deno.env.get("SPREADSHEET_ID");
    const credJson      = Deno.env.get("GOOGLE_CREDENTIALS_JSON");

    if (!spreadsheetId || !credJson) {
      return new Response(
        JSON.stringify({ error: "Faltan secrets: SPREADSHEET_ID o GOOGLE_CREDENTIALS_JSON" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cred        = JSON.parse(credJson) as ServiceAccount;
    const accessToken = await getGoogleAccessToken(cred);
    const items       = await readChecklist(spreadsheetId, accessToken);

    return new Response(JSON.stringify(items), {
      status:  200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get-checklist error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status:  500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
