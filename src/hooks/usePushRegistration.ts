import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { isNativeApp } from '@/lib/native';
import { useOrganization } from './useOrganization';
import { useSession } from './useSession';

/**
 * Registra o aparelho pra push e trata o toque na notificação. Fora da casca
 * nativa é no-op — o navegador não passa por aqui (web push exigiria VAPID e
 * service worker próprio, fora do escopo).
 *
 * O plugin é importado sob demanda: no build web ele nem entra no bundle.
 */
export function usePushRegistration() {
  const { user } = useSession();
  const { orgId } = useOrganization();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeApp || !user?.id || !orgId) return;

    let disposed = false;

    (async () => {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      // O id bate com o default_notification_channel_id do AndroidManifest.
      // Sem canal, o Android 8+ recebe a mensagem e não mostra nada.
      if (Capacitor.getPlatform() === 'android') {
        await PushNotifications.createChannel({
          id: 'novus_default',
          name: 'Avisos da escola',
          importance: 4,
          visibility: 1,
        });
      }

      const permission = await PushNotifications.checkPermissions();
      const granted =
        permission.receive === 'granted'
          ? true
          : (await PushNotifications.requestPermissions()).receive === 'granted';

      // Recusar push não pode quebrar nada: o app inteiro funciona sem.
      if (!granted || disposed) return;

      await PushNotifications.addListener('registration', async ({ value }) => {
        // UNIQUE(token) no banco: o mesmo aparelho reinstalado/trocado de conta
        // atualiza a linha em vez de acumular tokens mortos.
        await supabase.from('push_tokens').upsert(
          {
            organization_id: orgId,
            user_id: user.id,
            token: value,
            platform: Capacitor.getPlatform(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'token' },
        );
      });

      await PushNotifications.addListener('registrationError', (error) => {
        console.warn('push registration error', error);
      });

      // Deep link: o servidor manda { route: '/m/familia/mural' } no data.
      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const route = action.notification.data?.route;
        if (typeof route === 'string' && route.startsWith('/')) navigate(route);
      });

      await PushNotifications.register();
    })();

    return () => {
      disposed = true;
    };
  }, [user?.id, orgId, navigate]);
}
