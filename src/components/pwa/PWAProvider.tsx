
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { pwaManager } from '@/lib/pwa';
import { logAuditSafe } from '@/utils/auditSafe';
import { logger } from '@/lib/logger';

interface PWAContextType {
  canInstall: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  install: () => Promise<boolean>;
  reloadForUpdate: () => void;
}

const PWAContext = createContext<PWAContextType | null>(null);

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within PWAProvider');
  }
  return context;
}

interface PWAProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export function PWAProvider({ children, enabled = true }: PWAProviderProps) {
  const [canInstall, setCanInstall] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    // Guard: only in browser environment
    if (typeof window === 'undefined') return;

    // Initialize online status
    setIsOnline(navigator.onLine);

    if (!enabled) {
      return;
    }

    // Initialize PWA manager (registra o service worker gerado no build)
    pwaManager.initialize(true, () => {
      setHasUpdate(true);
      logAuditSafe('pwa_event', {
        type: 'update_available',
        pathname: window.location.pathname,
      });
    });

    // Setup install prompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setCanInstall(true);

      logAuditSafe('pwa_event', {
        type: 'install_prompt_shown',
        pathname: window.location.pathname,
      });
    };

    // Setup online/offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      logAuditSafe('pwa_event', {
        type: 'online',
        pathname: window.location.pathname,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      logAuditSafe('pwa_event', {
        type: 'offline',
        pathname: window.location.pathname,
      });
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check if already installable
    if ('serviceWorker' in navigator) {
      setCanInstall(pwaManager.isInstallable());
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled]);

  const install = async (): Promise<boolean> => {
    try {
      const result = await pwaManager.showInstallPrompt();
      
      if (result) {
        setCanInstall(false);
        await logAuditSafe('pwa_event', {
          type: 'install_confirmed',
          pathname: window.location.pathname,
        });
      }
      
      return result;
    } catch (error) {
      logger.error('PWA install failed', { error });
      return false;
    }
  };

  const reloadForUpdate = () => {
    logAuditSafe('pwa_event', {
      type: 'update_applied',
      pathname: window.location.pathname,
    });

    pwaManager.applyUpdate();
  };

  const value: PWAContextType = {
    canInstall,
    isOnline,
    hasUpdate,
    install,
    reloadForUpdate,
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
}
