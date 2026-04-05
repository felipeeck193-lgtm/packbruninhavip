import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PixCodeDisplayProps {
  copyPaste: string;
  qrCodeBase64?: string;
}

export const PixCodeDisplay = ({ copyPaste, qrCodeBase64 }: PixCodeDisplayProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyPaste);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  return (
    <div className="space-y-2">
      <div className="bg-secondary rounded-lg p-2">
        <p className="text-[10px] text-muted-foreground mb-1">Código Copia e Cola:</p>
        <p className="text-xs text-foreground break-all font-mono leading-relaxed">
          {copyPaste.length > 80 ? copyPaste.slice(0, 80) + "..." : copyPaste}
        </p>
      </div>
      <button
        onClick={handleCopy}
        className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2"
      >
        {copied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar código PIX</>}
      </button>
    </div>
  );
};

export const PaymentChecking = () => (
  <div className="flex items-center gap-2">
    <Loader2 className="w-4 h-4 animate-spin text-primary" />
    <p className="text-sm text-foreground">verificando pagamento... 🔍</p>
  </div>
);
