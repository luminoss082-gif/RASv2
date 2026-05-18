import { supabaseClient } from "./config.js";
import { state, setCurrentUserId } from "./core.js";

let currentChatUserId = null;

export async function initChat() {
  if (!window.location.pathname.includes("chat.html")) return;

  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  setCurrentUserId(user.id);

  await loadChatUsers();
  initChatForm();
  subscribeRealtimeMessages();
}

async function loadChatUsers() {
  const chatUsers = document.getElementById("chatUsers");

  if (!chatUsers) return;

  const { data: access, error } = await supabaseClient
    .from("chat_access")
    .select(`
      target_id,
      profiles:target_id (*)
    `)
    .eq("buyer_id", state.currentUserId);

  if (error) {
    chatUsers.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  chatUsers.innerHTML = "";

  if (!access || access.length === 0) {
    chatUsers.innerHTML = `
      <div class="chat-empty">
        <div>
          <strong>Aucun chat débloqué</strong>
          <span>Vous devez payer un accès pour discuter avec un profil.</span>
        </div>
      </div>
    `;
    return;
  }

  access.forEach((row) => {
    const profile = row.profiles;
    if (!profile) return;

    const div = document.createElement("div");
    div.className = "chat-user";

    div.innerHTML = `
    src="${
  profile.avatar_url
    ? profile.avatar_url.startsWith("http")
      ? profile.avatar_url
      : supabaseClient.storage
          .from("avatars")
          .getPublicUrl(profile.avatar_url).data.publicUrl
    : "default-avatar.png"
}"

      <div class="chat-user-info">
        <strong>${profile.pseudo || "Utilisateur"}</strong>
        <small>${profile.city || ""}</small>
      </div>
    `;

    div.onclick = async () => {
      currentChatUserId = profile.id;

      document.querySelectorAll(".chat-user").forEach(u => {
        u.classList.remove("active");
      });

      div.classList.add("active");

      const chatHeader = document.getElementById("chatHeader");

      if (chatHeader) {
        chatHeader.innerHTML = `
          <h2>${profile.pseudo || "Conversation"}</h2>
          <p>Chat débloqué</p>
        `;
      }

      await loadMessages(profile.id);
    };

    chatUsers.appendChild(div);
  });
}

async function loadMessages(otherUserId) {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;

  const { data: messages, error } = await supabaseClient
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${state.currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${state.currentUserId})`
    )
    .order("created_at", { ascending: true });

  if (error) {
    chatMessages.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  chatMessages.innerHTML = "";

  (messages || []).forEach((msg) => {
    appendMessage(msg);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

const renderedMessages = new Set();

function appendMessage(msg) {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;

  if (msg.id && renderedMessages.has(msg.id)) return;
  if (msg.id) renderedMessages.add(msg.id);

  const div = document.createElement("div");

  div.className =
    msg.sender_id === state.currentUserId
      ? "chat-message me"
      : "chat-message";

  div.innerHTML = `
    <div>${msg.content}</div>
    <small>
      ${new Date(msg.created_at || Date.now()).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })}
    </small>
  `;

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function initChatForm() {
  const chatForm = document.getElementById("chatForm");

  if (!chatForm) return;

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentChatUserId) {
      alert("Sélectionnez une conversation.");
      return;
    }

    const input = document.getElementById("chatInput");
    const content = input.value.trim();

    if (!content) return;

    const { data: allowed } = await supabaseClient
      .from("chat_access")
      .select("id")
      .eq("buyer_id", state.currentUserId)
      .eq("target_id", currentChatUserId)
      .maybeSingle();

    if (!allowed) {
      alert("Vous devez débloquer ce chat avant d’envoyer un message.");
      return;
    }

const { data: newMessage, error } = await supabaseClient
  .from("messages")
  .insert({
    sender_id: state.currentUserId,
    receiver_id: currentChatUserId,
    content
  })
  .select()
  .single();

if (error) {
  alert(error.message);
  return;
}

input.value = "";

/* Affiche directement le message sans attendre l’actualisation */
appendMessage(newMessage);
  });
}

function subscribeRealtimeMessages() {
  supabaseClient
    .channel("messages-realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages"
      },
      (payload) => {
        const msg = payload.new;

        const isCurrentConversation =
          (msg.sender_id === state.currentUserId &&
            msg.receiver_id === currentChatUserId) ||
          (msg.receiver_id === state.currentUserId &&
            msg.sender_id === currentChatUserId);

        if (!isCurrentConversation) return;

        appendMessage(msg);
      }
    )
    .subscribe();
}