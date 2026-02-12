import { Package, Zap } from "lucide-react";

interface ShippingOptionsProps {
  selected: string;
  onSelect: (option: string) => void;
}

const ShippingOptions = ({ selected, onSelect }: ShippingOptionsProps) => {
  const options = [
    {
      id: "pac",
      label: "Correios PAC",
      price: "R$ 23,94",
      delivery: "8 a 17 dias úteis",
      icon: Package,
    },
    {
      id: "sedex",
      label: "Correios SEDEX",
      price: "R$ 35,67",
      delivery: "1 a 2 dias úteis",
      icon: Zap,
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground">Opções de Frete</h3>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
            selected === opt.id
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/30"
          }`}
        >
          <opt.icon className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-sm">{opt.label}</p>
            <p className="text-xs text-muted-foreground">{opt.delivery}</p>
          </div>
          <span className="font-bold text-sm">{opt.price}</span>
        </button>
      ))}
    </div>
  );
};

export default ShippingOptions;
