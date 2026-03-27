import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";
import CountdownTimer from "@/components/CountdownTimer";
import QuantitySelector from "@/components/QuantitySelector";
import AddressForm, { type AddressData } from "@/components/AddressForm";
import ShippingOptions from "@/components/ShippingOptions";
import productBanner from "@/assets/product-banner.png";
import confirmationImg from "@/assets/confirmation.jpg";

const UNIT_PRICE = 39.90;
const ATOMOPAY_CHECKOUT_URL = "https://go.atomopay.com.br/dolhnb05tc";

const Index = () => {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [step, setStep] = useState<"checkout" | "payment" | "confirmed">("checkout");

  // Customer
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpf, setCpf] = useState("");

  // Address
  const [address, setAddress] = useState<AddressData>({
    cep: "", street: "", neighborhood: "", city: "", state: "", number: "", complement: "",
  });
  const [addressLoaded, setAddressLoaded] = useState(false);

  // Shipping
  const [shipping, setShipping] = useState("");

  const shippingCost = shipping === "sedex" ? 35.67 : shipping === "pac" ? 23.94 : 0;
  const total = quantity * UNIT_PRICE + shippingCost;

  const handleSubmit = () => {
    if (!name || !email || !whatsapp) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (!address.cep || !address.street || !address.number || !address.city || !address.state) {
      toast({ title: "Preencha o endereço completo", variant: "destructive" });
      return;
    }
    if (!shipping) {
      toast({ title: "Selecione uma opção de frete", variant: "destructive" });
      return;
    }

    // Open AtomoPay checkout in new tab
    window.open(ATOMOPAY_CHECKOUT_URL, "_blank");
    setStep("payment");
  };

  if (step === "confirmed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <img src={confirmationImg} alt="Pedido confirmado" className="w-full rounded-xl shadow-lg" />
        </div>
      </div>
    );
  }

  if (step === "payment") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-6 space-y-5 text-center">
          <ShieldCheck className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-xl font-bold">Finalize o pagamento via PIX</h2>
          <p className="text-muted-foreground text-sm">
            Complete o pagamento na página da AtomoPay que foi aberta.
          </p>
          <p className="text-sm text-muted-foreground">
            Total: <strong className="text-price text-lg">R$ {total.toFixed(2).replace(".", ",")}</strong>
          </p>

          <div className="space-y-3">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => window.open(ATOMOPAY_CHECKOUT_URL, "_blank")}
            >
              Abrir página de pagamento novamente
            </Button>
            <Button
              className="w-full"
              onClick={() => setStep("confirmed")}
            >
              Já realizei o pagamento
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CountdownTimer initialMinutes={5} />

      <div className="max-w-lg mx-auto p-4 space-y-5 pb-8">
        {/* Product Banner */}
        <img
          src={productBanner}
          alt="Conjunto Premium Toalhas"
          className="w-full rounded-xl shadow-md"
        />

        {/* Product Info */}
        <div className="bg-card rounded-xl p-4 shadow-sm space-y-3">
          <h1 className="text-lg font-bold leading-tight">
            Conjunto Premium 15 Toalhas Super Banhão de Alta Maciez + 5 Toalhas de Rosto de BRINDE
          </h1>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-extrabold text-price">
                R$ {UNIT_PRICE.toFixed(2).replace(".", ",")}
              </span>
              <span className="text-sm text-muted-foreground ml-2">/ unidade</span>
            </div>
            <QuantitySelector quantity={quantity} onQuantityChange={setQuantity} />
          </div>
        </div>

        {/* Customer Form */}
        <div className="bg-card rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="font-semibold text-foreground">Seus Dados</h3>
          <div>
            <Label htmlFor="name">Nome completo *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div>
            <Label htmlFor="email">E-mail *</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
          </div>
          <div>
            <Label htmlFor="whatsapp">WhatsApp *</Label>
            <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
        </div>

        {/* Address */}
        <div className="bg-card rounded-xl p-4 shadow-sm">
          <AddressForm
            address={address}
            onAddressChange={setAddress}
            onCepLoaded={() => setAddressLoaded(true)}
          />
        </div>

        {/* Shipping */}
        {(addressLoaded || address.city) && (
          <div className="bg-card rounded-xl p-4 shadow-sm">
            <ShippingOptions selected={shipping} onSelect={setShipping} />
          </div>
        )}

        {/* Summary */}
        {shipping && (
          <div className="bg-card rounded-xl p-4 shadow-sm space-y-2">
            <h3 className="font-semibold">Resumo</h3>
            <div className="flex justify-between text-sm">
              <span>{quantity}x Conjunto Premium Toalhas</span>
              <span>R$ {(quantity * UNIT_PRICE).toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Frete ({shipping.toUpperCase()})</span>
              <span>R$ {shippingCost.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-price">R$ {total.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>
        )}

        {/* Pay Button */}
        <Button
          className="w-full h-14 text-lg font-bold gap-2"
          onClick={handleSubmit}
        >
          <ShieldCheck className="w-5 h-5" />
          Pagar com PIX
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          🔒 Pagamento 100% seguro via PIX
        </p>
      </div>
    </div>
  );
};

export default Index;
