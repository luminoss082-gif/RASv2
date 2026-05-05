/* =========================
   NOTIFICATIONS INTERNES + PERSISTANTES
========================= */

import { supabaseClient } from "./config.js";
import { state, setCurrentUserId, setNotifList } from "./core.js";
import { sendPushNotification } from "./push.js";

export function addNotificationLocal(n) {
  state.notifList.unshift(n);
  updateNotifUI();
}

export function updateNotifUI() {
  const notifBell = document.getElementById("notifBell");
  const notifPanel = document.getElementById("notifPanel");
  if (!notifBell || !notifPanel) return;

  const unread = state.notifList.some(n => !n.is_read);
  if (unread) notifBell.classList.add("active");
  else notifBell.classList.remove("active");

  notifPanel.innerHTML = state.notifList.map(n => `
    <div class="notif-item" data-id="${n.id || ""}">
      <strong>•</strong> ${n.content}
      <br><small>${n.date}</small>
    </div>
  `).join("");
}

export async function loadPersistentNotifications() {
  if (!state.currentUserId) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    setCurrentUserId(user?.id || null);
  }
  if (!state.currentUserId) return;

  const { data: notifs } = await supabaseClient
    .from("notifications")
    .select("*")
    .eq("user_id", state.currentUserId)
    .order("created_at", { ascending: false });

  setNotifList((notifs || []).map(n => ({
    id: n.id,
    content: n.content,
    link: n.link,
    is_read: n.is_read,
    date: new Date(n.created_at).toLocaleString()
  })));

  updateNotifUI();
}

export async function markNotificationsRead() {
  if (!state.currentUserId) return;

  await supabaseClient
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", state.currentUserId);

  setNotifList(state.notifList.map(n => ({ ...n, is_read: true })));
  updateNotifUI();
}

export async function createNotification(userId, type, content, link) {
  if (!userId || !content) return;

  const { data, error } = await supabaseClient
    .from("notifications")
    .insert({ user_id: userId, type, content, link })
    .select()
    .single();

  if (error) {
    console.error("Notif error:", error.message);
    return;
  }

  addNotificationLocal({
    id: data.id,
    content: data.content,
    link: data.link,
    is_read: data.is_read,
    date: new Date(data.created_at).toLocaleString()
  });

  sendPushNotification(userId, "LoveConnect", content, link || "home.html");
}

export function initNotificationUI() {
  const notifBell = document.getElementById("notifBell");
  const notifPanel = document.getElementById("notifPanel");

  if (notifBell) {
    notifBell.onclick = () => {
      if (!notifPanel) return;
      notifPanel.style.display = notifPanel.style.display === "block" ? "none" : "block";
      markNotificationsRead();
    };
  }
}
