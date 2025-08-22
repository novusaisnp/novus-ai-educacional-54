
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { pwaManager } from '@/portal/pwa';
import { logAuditSafe } from '@/utils/auditSafe';
import { logger } from '@/lib/logger';

interface PWAContextType {
  canInstall: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  swVersion?: string;
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
  const [swVersion, setSwVersion] = useState<string>();

  useEffect(() => {
    // Guard: only in browser environment
    if (typeof window === 'undefined') return;
    
    // Initialize online status
    setIsOnline(navigator.onLine);
    
    if (!enabled || !window.location.pathname.startsWith('/portal/')) {
      return;
    }

    // Initialize PWA manager
    pwaManager.initializeForPortal(true);

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

    // Setup service worker update listener
    const handlePWAUpdate = () => {
      setHasUpdate(true);
      logAuditSafe('pwa_event', {
        type: 'update_available',
        pathname: window.location.pathname,
        swVersion,
      });
    };

    // Setup service worker message listener
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_VERSION') {
        setSwVersion(event.data.version);
      }
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pwa-update-available', handlePWAUpdate);
    
    // Service worker listeners (with guard)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker?.addEventListener('message', handleSWMessage);
      
      // Check if already installable
      setCanInstall(pwaManager.isInstallable());

      // Request SW version
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' });
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pwa-update-available', handlePWAUpdate);
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
      }
    };
  }, [enabled, swVersion]);

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
      swVersion,
    });
    
    window.location.reload();
  };

  const value: PWAContextType = {
    canInstall,
    isOnline,
    hasUpdate,
    swVersion,
    install,
    reloadForUpdate,
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
}
