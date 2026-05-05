/* =========================
   PUSH (PWA / WEB PUSH)
========================= */

import { supabaseClient, VAPID_PUBLIC_KEY, EDGE_FUNCTION_PUSH_URL } from "./config.js";
import { state, setCurrentUserId } from "./core.js";
import { urlBase64ToUint8Array } from "./utils.js";

export function registerServiceWorker() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js");
}

export async function initPushRegistration() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
  if (Notification.permission === "granted") await subscribePush();
}

export async function askPushPermission() {
  if (!("Notification" in window)) return;
  const permission = await Notification.requestPermission();
  if (permission === "granted") await subscribePush();
}

export async function subscribePush() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });

  if (!state.currentUserId) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    setCurrentUserId(user?.id || null);
  }
  if (!state.currentUserId) return;

  await supabaseClient.from("push_subscriptions").insert({
    user_id: state.currentUserId,
    subscription: sub.toJSON()
  });
}

export async function sendPushNotification(userId, title, body, url) {
  try {
    await fetch(EDGE_FUNCTION_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title, body, url })
    });
  } catch (e) {
    console.warn("Push error", e);
  }
}
