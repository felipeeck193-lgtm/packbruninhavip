import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ATOMOPAY_API_TOKEN = Deno.env.get('ATOMOPAY_API_TOKEN');
    if (!ATOMOPAY_API_TOKEN) {
      throw new Error('ATOMOPAY_API_TOKEN is not configured');
    }

    const { name, email, whatsapp, cpf, amount, quantity, offer_hash } = await req.json();

    if (!name || !email || !whatsapp || !amount) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: name, email, whatsapp, amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = {
      api_token: ATOMOPAY_API_TOKEN,
      offer_hash: offer_hash || "",
      amount,
      payment_method: "pix",
      cart: [
        {
          name: "PACK MEGA DIGITAL",
          quantity: quantity || 1,
          price: amount,
        },
      ],
      customer: {
        name,
        email,
        phone: whatsapp,
        ...(cpf ? { document: cpf } : {}),
      },
    };

    console.log("Sending to AtomoPay:", JSON.stringify(payload));

    const response = await fetch('https://api.atomopay.com.br/api/public/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("AtomoPay response:", response.status, JSON.stringify(data));

    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
