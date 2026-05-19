import { supabaseClient } from "./config.js";
import { state, setCurrentUserId } from "./core.js";

let currentChatUserId = null;
let notificationSound = new Audio("notification.mp3");

export async function initChat() {
  if (!window.location.pathname.includes("chat.html")) return;

  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    window.location.href = "index.html";
    return;
  }
  if ("Notification" in window) {
  Notification.requestPermission();
}

  setCurrentUserId(user.id);

  await loadChatUsers();
  initChatForm();
  subscribeRealtimeMessages();
}

function getAvatarUrl(avatarPath) {
  if (!avatarPath) return "default-avatar.png";

  if (avatarPath.startsWith("http")) {
    return avatarPath;
  }

  const cleanPath = avatarPath.replace(/^\/+/, "");

  return supabaseClient.storage
    .from("avatars")
    .getPublicUrl(cleanPath)
    .data.publicUrl;
}

async function loadChatUsers() {
  const chatUsers = document.getElementById("chatUsers");

  if (!chatUsers) return;

  const { data: access, error } = await supabaseClient
   .from("chat_access")
.select("*")
.or(`
  user_1.eq.${state.currentUserId},
  user_2.eq.${state.currentUserId}
`);

  if (error) {
    chatUsers.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  chatUsers.innerHTML = "";

for (const row of access || []) {

  const otherUserId =
    row.user_1 === state.currentUserId
      ? row.user_2
      : row.user_1;

  const { data: profile } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", otherUserId)
      .maybeSingle();

  if (!profile) continue;
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
  .or(`
    and(user_1.eq.${state.currentUserId},user_2.eq.${currentChatUserId}),
    and(user_1.eq.${currentChatUserId},user_2.eq.${state.currentUserId})
  `)
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

        /* message reçu */
        const isIncoming =
          msg.receiver_id === state.currentUserId;

        /* affiche message */
        if (isCurrentConversation) {
          appendMessage(msg);
        }

        /* notification */
        if (isIncoming) {

          /* son */
          notificationSound.play().catch(() => {});

          /* notif navigateur */
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {

            new Notification("Nouveau message 💌", {
              body: msg.content,
              icon: "/logo.png"
            });

          }

          /* badge titre */
          document.title = "💌 Nouveau message";
        }

      }
    )
    .subscribe();
}