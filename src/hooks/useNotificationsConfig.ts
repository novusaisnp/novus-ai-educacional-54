
import { useCallback, useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";

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

function storageKey(orgId?: string) {
  return `notifications:${orgId ?? "none"}`;
}

export function useNotificationsConfig() {
  const { orgId } = useOrganization();

  const getConfig = useCallback((): NotificationsConfig => {
    if (!orgId) return defaultConfig;
    try {
      const raw = localStorage.getItem(storageKey(orgId));
      if (!raw) return defaultConfig;
      const parsed = JSON.parse(raw);
      return {
        ...defaultConfig,
        ...parsed,
        enabled: { ...defaultConfig.enabled, ...(parsed?.enabled ?? {}) },
      } as NotificationsConfig;
    } catch {
      return defaultConfig;
    }
  }, [orgId]);

  const [cfg, setCfg] = useState<NotificationsConfig>(getConfig);

  // getConfig muda de identidade quando orgId muda (troca de organização) — recarrega
  // o estado local da nova org em vez de continuar mostrando o cfg da anterior.
  useEffect(() => {
    setCfg(getConfig());
  }, [getConfig]);

  const setConfig = useCallback((updater: (prev: NotificationsConfig) => NotificationsConfig) => {
    if (!orgId) return;
    setCfg((prev) => {
      const next = updater(prev);
      localStorage.setItem(storageKey(orgId), JSON.stringify(next));
      return next;
    });
  }, [orgId]);

  const isEmailEnabled = !!cfg.enabled.email;
  const isWhatsappEnabled = !!cfg.enabled.whatsapp;

  return { config: cfg, setConfig, isEmailEnabled, isWhatsappEnabled, orgId };
}
