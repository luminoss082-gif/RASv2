import { requireAdmin } from "./admin-guard.js";
import { supabaseClient } from "./config.js";

export async function initAdminUsers() {
  const adminUsers = document.getElementById("adminUsers");
  if (!adminUsers) return;

  const isAdmin = await requireAdmin();
  if (!isAdmin) return;

  await loadAdminUsers();
  await loadChatRequests();
}

async function loadAdminUsers() {
  const adminUsers = document.getElementById("adminUsers");
  if (!adminUsers) return;

  const { data: users, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    adminUsers.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
    return;
  }

  updateStats(users || []);
  renderUsers(users || []);
}

function updateStats(users) {
  const statUsers = document.getElementById("statUsers");
  const statOnline = document.getElementById("statOnline");
  const statVerified = document.getElementById("statVerified");
  const statBanned = document.getElementById("statBanned");

  if (statUsers) statUsers.textContent = users.length;
  if (statOnline) statOnline.textContent = users.filter(u => u.is_online).length;
  if (statVerified) statVerified.textContent = users.filter(u => u.is_verified).length;
  if (statBanned) statBanned.textContent = users.filter(u => u.is_banned).length;
}

function renderUsers(users) {
  const adminUsers = document.getElementById("adminUsers");
  if (!adminUsers) return;

  adminUsers.innerHTML = "";

  if (users.length === 0) {
    adminUsers.innerHTML = `<tr><td colspan="5">Aucun utilisateur.</td></tr>`;
    return;
  }

  users.forEach((u) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        <img
          src="${u.avatar_url || "assets/default-avatar.png"}"
          class="chat-avatar"
          onerror="this.src='assets/default-avatar.png'"
        >
      </td>

      <td>${u.pseudo || "Profil"}</td>
      <td>${u.city || "-"}</td>
      <td>${u.is_online ? "🟢 En ligne" : "⚫ Hors ligne"}</td>

      <td>
        <button class="btn ghost verify-btn" data-id="${u.id}">
          ${u.is_verified ? "Retirer vérif" : "Vérifier"}
        </button>

        <button class="btn danger ban-btn" data-id="${u.id}">
          ${u.is_banned ? "Débannir" : "Bannir"}
        </button>
      </td>
    `;

    adminUsers.appendChild(tr);
  });

  bindActions(users);
}

function bindActions(users) {
  document.querySelectorAll(".verify-btn").forEach((btn) => {
    btn.onclick = async () => {
      const user = users.find(u => u.id === btn.dataset.id);
      if (!user) return;

      await supabaseClient
        .from("profiles")
        .update({ is_verified: !user.is_verified })
        .eq("id", user.id);

      await loadAdminUsers();
    };
  });

  document.querySelectorAll(".ban-btn").forEach((btn) => {
    btn.onclick = async () => {
      const user = users.find(u => u.id === btn.dataset.id);
      if (!user) return;

      await supabaseClient
        .from("profiles")
        .update({ is_banned: !user.is_banned })
        .eq("id", user.id);

      await loadAdminUsers();
    };
  });
}

/* Débloquer chat */
const unlockChatBtn = document.getElementById("unlockChatBtn");

if (unlockChatBtn) {
  unlockChatBtn.onclick = async () => {
    const buyerId = document.getElementById("buyerId")?.value.trim();
    const targetId = document.getElementById("targetId")?.value.trim();

    if (!buyerId || !targetId) {
      alert("Remplis les deux ID.");
      return;
    }

    const { error } = await supabaseClient
      .from("chat_access")
      .insert({
        buyer_id: buyerId,
        target_id: targetId
      });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Chat débloqué !");
  };
}

/* Notification globale */
const sendGlobalNotifBtn = document.getElementById("sendGlobalNotifBtn");

if (sendGlobalNotifBtn) {
  sendGlobalNotifBtn.onclick = async () => {
    const text = document.getElementById("globalNotifText")?.value.trim();

    if (!text) {
      alert("Message vide.");
      return;
    }

    const { data: users, error } = await supabaseClient
      .from("profiles")
      .select("id");

    if (error) {
      alert(error.message);
      return;
    }

    for (const user of users || []) {
      await supabaseClient
        .from("notifications")
        .insert({
          user_id: user.id,
          type: "admin",
          content: text
        });
    }

    alert("Notification envoyée !");
  };
}

/* Recherche admin */
const adminSearch = document.getElementById("adminSearch");

if (adminSearch) {
  adminSearch.addEventListener("input", async (e) => {
    const value = e.target.value.toLowerCase();

    const { data: users } = await supabaseClient
      .from("profiles")
      .select("*");

    const filtered = (users || []).filter((u) => {
      return (
        (u.pseudo || "").toLowerCase().includes(value) ||
        (u.city || "").toLowerCase().includes(value) ||
        (u.id || "").includes(value)
      );
    });

    renderUsers(filtered);
  });
}
async function loadChatRequests() {
  const box = document.getElementById("adminChatRequests");
  if (!box) return;

  const { data, error } = await supabaseClient
    .from("chat_requests")
    .select(`
      id,
      status,
      created_at,
      requester:requester_id (
        id,
        pseudo,
        avatar_url
      ),
      target:target_id (
        id,
        pseudo,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    box.innerHTML = `<p class="error-msg">${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    box.innerHTML = `<p>Aucune demande de chat.</p>`;
    return;
  }

  box.innerHTML = data.map((r) => `
    <div class="admin-request-card">
      <div>
        <strong>${r.requester?.pseudo || "Utilisateur"}</strong>
        veut parler à
        <strong>${r.target?.pseudo || "Profil"}</strong>
      </div>

      <small>Status : ${r.status}</small>

      <div class="admin-actions">
        <button class="btn ghost" data-accept-request="${r.id}">
          Accepter
        </button>

        <button class="btn danger" data-refuse-request="${r.id}">
          Refuser
        </button>

        <button
          class="btn primary"
          data-unlock-request="${r.id}"
          data-buyer="${r.requester?.id}"
          data-target="${r.target?.id}"
        >
          Débloquer chat
        </button>
      </div>
    </div>
  `).join("");

  box.querySelectorAll("[data-accept-request]").forEach((btn) => {
    btn.onclick = async () => {
      await supabaseClient
        .from("chat_requests")
        .update({ status: "accepted" })
        .eq("id", btn.dataset.acceptRequest);

      await loadChatRequests();
    };
  });

  box.querySelectorAll("[data-refuse-request]").forEach((btn) => {
    btn.onclick = async () => {
      await supabaseClient
        .from("chat_requests")
        .update({ status: "refused" })
        .eq("id", btn.dataset.refuseRequest);

      await loadChatRequests();
    };
  });

  box.querySelectorAll("[data-unlock-request]").forEach((btn) => {
    btn.onclick = async () => {
      const buyerId = btn.dataset.buyer;
      const targetId = btn.dataset.target;
      const requestId = btn.dataset.unlockRequest;

      const { error } = await supabaseClient
        .from("chat_access")
        .insert({
          buyer_id: buyerId,
          target_id: targetId
        });

      if (error && error.code !== "23505") {
        alert(error.message);
        return;
      }

      await supabaseClient
        .from("chat_requests")
        .update({ status: "unlocked" })
        .eq("id", requestId);

      alert("Chat débloqué !");
      await loadChatRequests();
    };
  });
}