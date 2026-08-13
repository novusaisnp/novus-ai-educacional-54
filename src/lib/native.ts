import { Capacitor } from '@capacitor/core';

/**
 * true só dentro da casca Capacitor (Android/iOS). No navegador — inclusive na
 * PWA instalada — é false, então nada do app web muda de comportamento.
 */
export const isNativeApp = Capacitor.isNativePlatform();
