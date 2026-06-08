import { useState, useEffect, useCallback } from "react";
import { useGetVapidPublicKey, useSubscribePush, useUnsubscribePush } from "@workspace/api-client-react";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [swReg, setSwReg] = useState<ServiceWorkerRegistration | null>(null);

  const { data: vapidData } = useGetVapidPublicKey({
    query: { queryKey: ["vapid-key"], staleTime: Infinity, enabled: true },
  });
  const subscribeMutation = useSubscribePush();
  const unsubscribeMutation = useUnsubscribePush();

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
    if (!ok) return;
    setPermission(Notification.permission);

    const swUrl = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "") + "/sw.js";
    navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL ?? "/" })
      .then((reg) => {
        setSwReg(reg);
        return reg.pushManager.getSubscription();
      })
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  const subscribe = useCallback(async () => {
    if (!swReg || !vapidData?.publicKey) return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") { setLoading(false); return; }

      const existing = await swReg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const sub = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });

      const json = sub.toJSON();
      const keys = (json.keys ?? {}) as { p256dh?: string; auth?: string };
      if (!keys.p256dh || !keys.auth) throw new Error("Missing keys");

      await subscribeMutation.mutateAsync({
        data: { endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth },
      });
      setSubscribed(true);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, [swReg, vapidData, subscribeMutation]);

  const unsubscribe = useCallback(async () => {
    if (!swReg) return;
    setLoading(true);
    try {
      const sub = await swReg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeMutation.mutateAsync({ data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, [swReg, unsubscribeMutation]);

  return { supported, permission, subscribed, loading, subscribe, unsubscribe };
}
