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

    const { name, email, whatsapp, cpf, amount, quantity } = await req.json();

    if (!name || !email || !whatsapp) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: name, email, whatsapp' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const unitPrice = 3990;
    const qty = quantity || 1;
    const totalAmount = unitPrice * qty;

    const payload = {
      api_token: ATOMOPAY_API_TOKEN,
      offer_hash: "dolhnb05tc",
      amount: totalAmount,
      payment_method: "pix",
      cart: [{
        offer_hash: "dolhnb05tc",
        product_hash: "m2vssdnc7d",
        title: "PACK MEGA DIGITAL",
        operation_type: "pix",
        quantity: qty,
        price: unitPrice,
      }],
      customer: {
        name: name,
        email: email,
        phone: whatsapp.replace(/\D/g, ''),
        ...(cpf && cpf.replace(/\D/g, '').length >= 11 ? { document: cpf.replace(/\D/g, '') } : {}),
      },
    };

    console.log("Payload:", JSON.stringify(payload));

    const response = await fetch('https://api.atomopay.com.br/api/public/v1/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("Response:", response.status, JSON.stringify(data));

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
