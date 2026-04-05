const PAYMENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blackcat-payment`;

export interface CreateSaleParams {
  packType: "proibido" | "vip";
  customer: {
    name: string;
    cpf: string;
    email?: string;
    phone?: string;
  };
}

export interface PaymentData {
  transactionId: string;
  status: string;
  paymentData?: {
    qrCode: string;
    qrCodeBase64: string;
    copyPaste: string;
    expiresAt: string;
  };
}

export async function createSale(params: CreateSaleParams): Promise<PaymentData> {
  const resp = await fetch(PAYMENT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ action: "create-sale", ...params }),
  });

  const json = await resp.json();
  if (!resp.ok || !json.success) throw new Error(json.message || json.error || "Erro ao criar pagamento");
  return json.data;
}

export async function checkStatus(transactionId: string): Promise<{ status: string; paidAt?: string }> {
  const resp = await fetch(PAYMENT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ action: "check-status", transactionId }),
  });

  const json = await resp.json();
  if (!resp.ok || !json.success) throw new Error(json.message || json.error || "Erro ao verificar status");
  return json.data;
}
