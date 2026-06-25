import { supabase } from "@/integrations/supabase/client";

export type HubspotDeal = {
  dealname: string | null;
  project_address: string | null;
  numero_de_servicio_cfe: string | null;
};

export async function fetchHubspotDeal(dealId: string): Promise<HubspotDeal | null> {
  const { data, error } = await supabase.functions.invoke("hubspot-deal", {
    body: { dealId },
  });

  if (error) {
    // supabase-js wraps non-2xx as FunctionsHttpError; inspect context
    const ctx: any = (error as any).context;
    if (ctx?.status === 404) return null;
    throw new Error(error.message ?? "Error consultando HubSpot");
  }
  return data as HubspotDeal;
}
