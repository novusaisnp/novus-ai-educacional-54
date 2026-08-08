// PWA utilities for Portal dos Responsáveis

import { logger } from '@/lib/logger';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

class PWAManager {
  private installPrompt: BeforeInstallPromptEvent | null = null;
  private isRegistered = false;

  async registerServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      logger.warn('PWA: Service Worker not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/portal-sw.js', {
        scope: '/portal/'
      });

      logger.info('PWA: Service Worker registered', { 
        scope: registration.scope,
        updatefound: !!registration.update
      });

      // Check for updates
      registration.addEventListener('updatefound', () => {
        logger.info('PWA: Update found');
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              logger.info('PWA: Update available');
              this.notifyUpdateAvailable();
            }
          });
        }
      });

      this.isRegistered = true;
      return true;
    } catch (error) {
      logger.error('PWA: Service Worker registration failed', { error });
      return false;
    }
  }

  setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e as BeforeInstallPromptEvent;
      logger.info('PWA: Install prompt available');
    });

    window.addEventListener('appinstalled', () => {
      logger.info('PWA: App installed');
      this.installPrompt = null;
    });
  }

  async showInstallPrompt(): Promise<boolean> {
    if (!this.installPrompt) {
      logger.warn('PWA: Install prompt not available');
      return false;
    }

    try {
      await this.installPrompt.prompt();
      const choice = await this.installPrompt.userChoice;
      
      logger.info('PWA: Install prompt result', { outcome: choice.outcome });
      
      if (choice.outcome === 'accepted') {
        this.installPrompt = null;
        return true;
      }
      return false;
    } catch (error) {
      logger.error('PWA: Install prompt failed', { error });
      return false;
    }
  }

  isInstallable(): boolean {
    return !!this.installPrompt;
  }

  isInstalled(): boolean {
    // `standalone` é propriedade não-padrão do Safari/iOS, ausente no lib.dom Navigator.
    const nav = window.navigator as Navigator & { standalone?: boolean };
    return window.matchMedia('(display-mode: standalone)').matches ||
           nav.standalone === true;
  }

  private notifyUpdateAvailable(): void {
    // Dispatch custom event for update notification
    const event = new CustomEvent('pwa-update-available');
    window.dispatchEvent(event);
  }

  async initializeForPortal(enabled: boolean): Promise<void> {
    if (!enabled) {
      logger.info('PWA: Disabled for this organization');
      return;
    }

    // Only initialize if we're in the portal
    if (!window.location.pathname.startsWith('/portal/')) {
      return;
    }

    logger.info('PWA: Initializing for portal');
    
    this.setupInstallPrompt();
    await this.registerServiceWorker();
  }
}

export const pwaManager = new PWAManager();