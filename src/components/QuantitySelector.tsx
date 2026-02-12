import { Minus, Plus } from "lucide-react";

interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (qty: number) => void;
}

const QuantitySelector = ({ quantity, onQuantityChange }: QuantitySelectorProps) => {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
        className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="text-xl font-bold w-8 text-center">{quantity}</span>
      <button
        onClick={() => onQuantityChange(quantity + 1)}
        className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

export default QuantitySelector;
