/* =========================
   REALTIME NOTIFS + SUPPORT
========================= */

import { supabaseClient, ADMIN_ID } from "./config.js";
import { state, setCurrentUserId } from "./core.js";
import { createNotification, addNotificationLocal } from "./notifications.js";
import { appendSupportMessage } from "./support.js";

export function initRealtimeNotifications() {
  supabaseClient.channel("notif-messages").on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages" },
    async (payload) => {
      const m = payload.new;
      if (!state.currentUserId) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        setCurrentUserId(user?.id || null);
      }
      if (m.receiver === state.currentUserId) {
        await createNotification(m.receiver, "message", "Vous avez reçu un nouveau message", `chat.html?user=${m.sender}`);
      }
    }
  ).subscribe();

  supabaseClient.channel("notif-reports").on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "reports" },
    async () => {
      await createNotification(ADMIN_ID, "report", "Un nouveau signalement a été envoyé", "admin.html");
    }
  ).subscribe();

  supabaseClient.channel("notif-table").on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "notifications" },
    async (payload) => {
      const n = payload.new;
      if (!state.currentUserId) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        setCurrentUserId(user?.id || null);
      }
      if (n.user_id === state.currentUserId) {
        addNotificationLocal({
          id: n.id,
          content: n.content,
          link: n.link,
          is_read: n.is_read,
          date: new Date(n.created_at).toLocaleString()
        });
      }
    }
  ).subscribe();
}

export function initSupportRealtime() {
  supabaseClient.channel("support-messages").on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "support_messages" },
    (payload) => {
      const m = payload.new;
      if (window.currentTicketId && m.ticket_id === window.currentTicketId) appendSupportMessage(m);
      if (m.sender_role === "admin") {
        createNotification(m.sender_id, "support", "Nouvelle réponse de l’administrateur", "support.html");
      }
    }
  ).subscribe();
}
