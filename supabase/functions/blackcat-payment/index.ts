import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLACKCAT_BASE = "https://api.blackcatpay.com.br/api";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const BLACKCAT_API_KEY = Deno.env.get("BLACKCAT_API_KEY");
    if (!BLACKCAT_API_KEY) throw new Error("BLACKCAT_API_KEY not configured");

    const { action, ...params } = await req.json();

    if (action === "create-sale") {
      const { packType, customer } = params;

      const isVip = packType === "vip";
      const amount = isVip ? 3990 : 1990;
      const title = isVip ? "Pack VIP (1000 vídeos) + Chamada de Vídeo" : "Pack Proibido (100 vídeos)";

      const body = {
        amount,
        currency: "BRL",
        paymentMethod: "pix",
        items: [{ title, unitPrice: amount, quantity: 1, tangible: false }],
        customer: {
          name: customer.name,
          email: customer.email || "cliente@email.com",
          phone: customer.phone || "11999999999",
          document: { number: customer.cpf, type: "cpf" },
        },
        pix: { expiresInDays: 1 },
      };

      const resp = await fetch(`${BLACKCAT_BASE}/sales/create-sale`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": BLACKCAT_API_KEY,
        },
        body: JSON.stringify(body),
      });

      const data = await resp.json();

      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check-status") {
      const { transactionId } = params;

      const resp = await fetch(`${BLACKCAT_BASE}/sales/${transactionId}/status`, {
        method: "GET",
        headers: { "X-API-Key": BLACKCAT_API_KEY },
      });

      const data = await resp.json();

      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("blackcat-payment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
