
export {}

declare global {
  // Evento PWA: beforeinstallprompt (Chrome/Edge)
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  }
  
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}
