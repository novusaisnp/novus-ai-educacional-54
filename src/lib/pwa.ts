// PWA utilities — instalação, prompt e registro do service worker gerado pelo build

import { logger } from '@/lib/logger';
import { registerSW } from 'virtual:pwa-register';

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
  private updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

  private register(onNeedRefresh: () => void): void {
    this.updateSW = registerSW({
      immediate: true,
      onNeedRefresh,
      onRegisterError: (error) => {
        logger.error('PWA: Service Worker registration failed', { error });
      },
    });
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

  applyUpdate(): void {
    this.updateSW?.(true);
  }

  initialize(enabled: boolean, onNeedRefresh: () => void): void {
    if (!enabled) {
      logger.info('PWA: Disabled for this organization');
      return;
    }

    this.setupInstallPrompt();
    this.register(onNeedRefresh);
  }
}

export const pwaManager = new PWAManager();
