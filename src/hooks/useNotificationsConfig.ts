
import { useCallback, useMemo } from "react";
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

  const setConfig = useCallback((updater: (prev: NotificationsConfig) => NotificationsConfig) => {
    const prev = getConfig();
    const next = updater(prev);
    if (!orgId) return;
    localStorage.setItem(storageKey(orgId), JSON.stringify(next));
  }, [orgId, getConfig]);

  const cfg = useMemo(() => getConfig(), [getConfig]);

  const isEmailEnabled = !!cfg.enabled.email;
  const isWhatsappEnabled = !!cfg.enabled.whatsapp;

  return { config: cfg, setConfig, isEmailEnabled, isWhatsappEnabled, orgId };
}
