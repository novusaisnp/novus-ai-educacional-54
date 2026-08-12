import { useCallback } from "react";
import { useOrgSettings } from "@/hooks/useOrgSettings";

export type NotificationsConfig = {
  enabled: {
    email: boolean;
    whatsapp: boolean;
  };
  // Espaço para futuras chaves por org (ex.: remetente, masks, etc.)
};

const defaultConfig: NotificationsConfig = {
  enabled: { email: false, whatsapp: false },
};

export function useNotificationsConfig() {
  const { settings, saveKey, isSaving } = useOrgSettings();

  const raw = settings.notifications as Partial<NotificationsConfig> | undefined;
  const cfg: NotificationsConfig = {
    ...defaultConfig,
    ...raw,
    enabled: { ...defaultConfig.enabled, ...(raw?.enabled ?? {}) },
  };

  const setConfig = useCallback((updater: (prev: NotificationsConfig) => NotificationsConfig) => {
    const next = updater(cfg);
    void saveKey("notifications", next);
    // ponytail: sem optimistic update — useOrgSettings já invalida a query da org no sucesso,
    // o toggle reflete assim que o save volta. Se a UI parecer travada, adicionar optimistic aqui.
  }, [cfg, saveKey]);

  const isEmailEnabled = !!cfg.enabled.email;
  const isWhatsappEnabled = !!cfg.enabled.whatsapp;

  return { config: cfg, setConfig, isEmailEnabled, isWhatsappEnabled, isSaving };
}
