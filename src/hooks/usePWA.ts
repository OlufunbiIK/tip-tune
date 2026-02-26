import {useEffect, useState, useCallback} from 'react';
import svc from '../utils/serviceWorker';

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setInstalled] = useState<boolean>(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // capture beforeinstallprompt
    function onBeforeInstall(e: any) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
    window.addEventListener('appinstalled', () => setInstalled(true));

    // register service worker
    (async () => {
      const r = await svc.registerServiceWorker();
      setSwRegistration(r as ServiceWorkerRegistration | null);
    })();

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return {outcome: 'no-prompt'};
    const event = deferredPrompt;
    event.prompt();
    const result = await event.userChoice;
    setDeferredPrompt(null);
    return result;
  }, [deferredPrompt]);

  const enablePush = useCallback(async () => {
    const perm = await svc.requestNotificationPermission();
    if (perm !== 'granted') return null;
    const sub = await svc.subscribeToPush(swRegistration || undefined);
    return sub;
  }, [swRegistration]);

  return {
    deferredPrompt,
    promptInstall,
    isInstalled,
    swRegistration,
    enablePush
  } as const;
}

export default usePWA;
