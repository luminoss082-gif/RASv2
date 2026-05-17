/* =========================
   NOTIFICATIONS INTERNES
========================= */

import { supabaseClient } from "./config.js";
import { state, setCurrentUserId, setNotifList } from "./core.js";
import { sendPushNotification } from "./push.js";

let currentFilter = "all";
let notifInterval = null;

/* =========================
   FILTRES
========================= */

function getFilteredNotifications() {
  if (currentFilter === "all") return state.notifList;
  if (currentFilter === "unread") return state.notifList.filter(n => !n.is_read);
  return state.notifList.filter(n => n.type === currentFilter);
}

/* =========================
   LOCAL
========================= */

export function addNotificationLocal(n) {
  state.notifList.unshift(n);
  updateNotifUI();
}

/* =========================
   UI
========================= */

export function updateNotifUI() {
  const notifBell = document.getElementById("notifBell");
  const notifPanel = document.getElementById("notifPanel");
  const notificationsList = document.getElementById("notificationsList");

  const filtered = getFilteredNotifications();
  const unreadCount = state.notifList.filter(n => !n.is_read).length;

  if (notifBell) {
    notifBell.classList.toggle("active", unreadCount > 0);
    notifBell.innerHTML = unreadCount > 0 ? `🔔 ${unreadCount}` : "🔔";
  }

  const renderNotif = (n) => `
    <div class="notif-item ${n.is_read ? "" : "unread"}" data-id="${n.id || ""}">
      <strong>${n.is_read ? "🔔" : "🔴"}</strong>
      <p>${n.content || ""}</p>
      <small>${n.date || ""}</small>
      ${n.link ? `<br><a href="${n.link}">Ouvrir</a>` : ""}
    </div>
  `;

  if (notifPanel) {
    notifPanel.innerHTML = state.notifList.length
      ? state.notifList.map(renderNotif).join("")
      : "<p>Aucune notification.</p>";
  }

  if (notificationsList) {
    notificationsList.innerHTML = filtered.length
      ? filtered.map(renderNotif).join("")
      : "<p>Aucune notification.</p>";
  }
}

/* =========================
   LOAD SUPABASE
========================= */

export async function loadPersistentNotifications() {
  if (!state.currentUserId) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    setCurrentUserId(user?.id || null);
  }

  if (!state.currentUserId) return;

  const { data: notifs, error } = await supabaseClient
    .from("notifications")
    .select("*")
    .eq("user_id", state.currentUserId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Erreur notifications:", error);
    return;
  }

  setNotifList((notifs || []).map(n => ({
    id: n.id,
    type: n.type || "system",
    content: n.content || "",
    link: n.link || "",
    is_read: !!n.is_read,
    date: new Date(n.created_at).toLocaleString()
  })));

  updateNotifUI();
}

/* =========================
   MARK READ
========================= */

export async function markNotificationsRead() {
  if (!state.currentUserId) return;

  await supabaseClient
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", state.currentUserId)
    .eq("is_read", false);

  setNotifList(state.notifList.map(n => ({
    ...n,
    is_read: true
  })));

  updateNotifUI();
}

/* =========================
   CREATE NOTIFICATION
========================= */

export async function createNotification(userId, type, content, link = "notifications.html") {
  if (!userId || !content) return;

  const { data, error } = await supabaseClient
    .from("notifications")
    .insert({
      user_id: userId,
      type: type || "system",
      content,
      link,
      is_read: false
    })
    .select()
    .single();

  if (error) {
    console.error("Notif error:", error.message);
    return;
  }

  if (userId === state.currentUserId) {
    addNotificationLocal({
      id: data.id,
      type: data.type,
      content: data.content,
      link: data.link,
      is_read: data.is_read,
      date: new Date(data.created_at).toLocaleString()
    });
  }

  sendPushNotification(
    userId,
    "LoveConnect",
    content,
    link || "notifications.html"
  );
}

/* =========================
   REALTIME
========================= */

function subscribeRealtimeNotifications() {
  if (!state.currentUserId) return;

  supabaseClient
    .channel("notifications-realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${state.currentUserId}`
      },
      (payload) => {
        const n = payload.new;

        addNotificationLocal({
          id: n.id,
          type: n.type || "system",
          content: n.content || "",
          link: n.link || "",
          is_read: !!n.is_read,
          date: new Date(n.created_at).toLocaleString()
        });
      }
    )
    .subscribe();
}

/* =========================
   INIT UI
========================= */

export async function initNotificationUI() {
  const notifBell = document.getElementById("notifBell");
  const notifPanel = document.getElementById("notifPanel");

  if (!state.currentUserId) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    setCurrentUserId(user?.id || null);
  }

  await loadPersistentNotifications();
  subscribeRealtimeNotifications();

  if (notifInterval) clearInterval(notifInterval);

  notifInterval = setInterval(() => {
    loadPersistentNotifications();
  }, 15000);

  if (notifBell) {
    notifBell.onclick = async () => {
      if (!notifPanel) return;

      notifPanel.classList.toggle("show");

      if (notifPanel.classList.contains("show")) {
        await markNotificationsRead();
      }
    };
  }

  document.addEventListener("click", (e) => {
    if (!notifPanel || !notifBell) return;

    if (
      !notifPanel.contains(e.target) &&
      !notifBell.contains(e.target)
    ) {
      notifPanel.classList.remove("show");
    }
  });

  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.onclick = () => {
      currentFilter = btn.dataset.filter;
      updateNotifUI();
    };
  });
}