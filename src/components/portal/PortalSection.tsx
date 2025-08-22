import { usePortalConfig } from "@/hooks/usePortalConfig";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

export function PortalSection() {
  const { config, save, isLoading } = usePortalConfig();
  const [enabled, setEnabled] = useState(false);
  const [allowRegister, setAllowRegister] = useState(false);
  const [allowOpenRequests, setAllowOpenRequests] = useState(true);

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setAllowRegister(config.allowRegister);
      setAllowOpenRequests(config.allowOpenRequests);
    }
  }, [config]);

  const handleSave = async () => {
    await save({
      enabled,
      allowRegister,
      allowOpenRequests,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Habilitar Portal</Label>
          <p className="text-xs text-muted-foreground">
            Permite acesso ao portal dos responsáveis
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} disabled={isLoading} />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Permitir Registro</Label>
          <p className="text-xs text-muted-foreground">
            Responsáveis podem se registrar no portal
          </p>
        </div>
        <Switch 
          checked={allowRegister} 
          onCheckedChange={setAllowRegister} 
          disabled={!enabled || isLoading} 
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Permitir Solicitações Abertas</Label>
          <p className="text-xs text-muted-foreground">
            Responsáveis podem criar demandas sem aprovação prévia
          </p>
        </div>
        <Switch 
          checked={allowOpenRequests} 
          onCheckedChange={setAllowOpenRequests} 
          disabled={!enabled || isLoading} 
        />
      </div>

      <div className="pt-2">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar Configurações do Portal'}
        </Button>
      </div>
    </div>
  );
}