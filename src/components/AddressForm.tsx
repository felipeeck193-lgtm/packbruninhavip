import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export interface AddressData {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  number: string;
  complement: string;
}

interface AddressFormProps {
  address: AddressData;
  onAddressChange: (address: AddressData) => void;
  onCepLoaded: () => void;
}

const AddressForm = ({ address, onAddressChange, onCepLoaded }: AddressFormProps) => {
  const [loadingCep, setLoadingCep] = useState(false);

  const handleCepChange = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    onAddressChange({ ...address, cep: cleanCep });

    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          onAddressChange({
            ...address,
            cep: cleanCep,
            street: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "",
            state: data.uf || "",
          });
          onCepLoaded();
        }
      } catch {
        // user fills manually
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const update = (field: keyof AddressData, value: string) => {
    onAddressChange({ ...address, [field]: value });
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground">Endereço de Entrega</h3>
      <div className="relative">
        <Label htmlFor="cep">CEP</Label>
        <Input
          id="cep"
          placeholder="00000-000"
          value={address.cep}
          onChange={(e) => handleCepChange(e.target.value)}
          maxLength={9}
        />
        {loadingCep && (
          <Loader2 className="absolute right-3 top-8 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>
      <div>
        <Label htmlFor="street">Rua</Label>
        <Input id="street" value={address.street} onChange={(e) => update("street", e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label htmlFor="number">Número</Label>
          <Input id="number" value={address.number} onChange={(e) => update("number", e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="complement">Complemento</Label>
          <Input id="complement" value={address.complement} onChange={(e) => update("complement", e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="neighborhood">Bairro</Label>
        <Input id="neighborhood" value={address.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" value={address.city} onChange={(e) => update("city", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="state">UF</Label>
          <Input id="state" value={address.state} onChange={(e) => update("state", e.target.value)} maxLength={2} />
        </div>
      </div>
    </div>
  );
};

export default AddressForm;
