/* =========================
   CHAT PREMIUM
========================= */

import { supabaseClient } from "./config.js";
import { state, setCurrentUserId } from "./core.js";
import { createNotification } from "./notifications.js";

export function initChat() {
  const chatUsers = document.getElementById("chatUsers");
  const chatMessages = document.getElementById("chatMessages");
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");

  async function start() {
    if (!chatUsers) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    setCurrentUserId(user.id);

    const { data: me } = await supabaseClient
      .from("profiles")
      .eq("id", user.id)
      .single();

    if (!me.is_premium) {
      chatUsers.innerHTML = "<p>Chat réservé aux membres Premium.</p>";
      return;
    }

    const { data: msgs } = await supabaseClient
      .from("messages")
      .select("sender, receiver")
      .or(`sender.eq.${user.id},receiver.eq.${user.id}`);

    const ids = new Set();
    (msgs || []).forEach((m) => {
      if (m.sender !== user.id) ids.add(m.sender);
      if (m.receiver !== user.id) ids.add(m.receiver);
    });

    if (ids.size === 0) {
      chatUsers.innerHTML = "<p>Aucune conversation pour l'instant.</p>";
      return;
    }

    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("id,pseudo,avatar_url")
      .in("id", Array.from(ids));

    chatUsers.innerHTML = "";

    (profiles || []).forEach((p) => {
      const div = document.createElement("div");
      div.className = "chat-user";
      div.innerHTML = `
        <img src="${p.avatar_url}" class="chat-avatar">
        <span>${p.pseudo}</span>
      `;
      div.onclick = () => {
        state.currentChatUserId = p.id;
        loadMessages();
      };
      chatUsers.appendChild(div);
    });

    supabaseClient.channel("chat-realtime").on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        const m = payload.new;
        if (
          state.currentChatUserId &&
          ((m.sender === state.currentUserId && m.receiver === state.currentChatUserId) ||
          (m.sender === state.currentChatUserId && m.receiver === state.currentUserId))
        ) appendMessage(m);
      }
    ).subscribe();
  }

  async function loadMessages() {
    if (!state.currentChatUserId || !chatMessages) return;

    const { data: blocks } = await supabaseClient
      .from("blocks")
      .select("blocked")
      .eq("blocker", state.currentUserId);

    const blockedIds = new Set((blocks || []).map(b => b.blocked));

    if (blockedIds.has(state.currentChatUserId)) {
      chatMessages.innerHTML = "<p>Vous avez bloqué cet utilisateur.</p>";
      return;
    }

    const { data } = await supabaseClient
      .from("messages")
      .select("*")
      .or(`and(sender.eq.${state.currentUserId},receiver.eq.${state.currentChatUserId}),and(sender.eq.${state.currentChatUserId},receiver.eq.${state.currentUserId})`)
      .order("created_at", { ascending: true });

    chatMessages.innerHTML = "";
    (data || []).forEach(appendMessage);
  }

  function appendMessage(m) {
    if (!chatMessages) return;
    const div = document.createElement("div");
    div.className = "chat-message";
    if (m.sender === state.currentUserId) div.classList.add("me");
    div.textContent = m.content;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  if (chatForm) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!state.currentChatUserId) return;

      const content = chatInput.value.trim();
      if (!content) return;

      const { data: { user } } = await supabaseClient.auth.getUser();

      await supabaseClient.from("messages").insert({
        sender: user.id,
        receiver: state.currentChatUserId,
        content
      });

      await createNotification(
        state.currentChatUserId,
        "message",
        "Vous avez reçu un nouveau message",
        `chat.html?user=${user.id}`
      );

      chatInput.value = "";
    });
  }

  start();
}
