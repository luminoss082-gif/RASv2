import { requireAdmin } from "./admin-guard.js";
import { supabaseClient } from "./config.js";

export async function initAdminUsers() {
  const adminUsers = document.getElementById("adminUsers");
  if (!adminUsers) return;

  const isAdmin = await requireAdmin();
  if (!isAdmin) return;

  await loadAdminUsers();
  await loadReports();
  await loadChatRequests();
  await loadManualPayments();
  
}

let adminUsersCache = [];

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
  adminUsersCache = users || [];
renderUsers(adminUsersCache);

document.querySelectorAll("[data-admin-filter]").forEach((btn) => {
  btn.onclick = () => {
    const filter = btn.dataset.adminFilter;

    let filtered = [...adminUsersCache];

    if (filter === "online") {
      filtered = filtered.filter(u => u.is_online);
    }

    if (filter === "verified") {
      filtered = filtered.filter(u => u.is_verified);
    }

    if (filter === "banned") {
      filtered = filtered.filter(u => u.is_banned);
    }

    if (filter === "no-avatar") {
      filtered = filtered.filter(u => !u.avatar_url);
    }

    renderUsers(filtered);
  };
});
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
     <td>
  ${
    u.is_online
      ? `
        <span class="online-dot"></span>
        En ligne
      `
      : `
        ⚫ Hors ligne
      `
  }
</td>

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

    const action = user.is_banned ? "débannir" : "bannir";

    const confirmAction = confirm(
      `Confirmer : ${action} ${user.pseudo || "cet utilisateur"} ?`
    );

    if (!confirmAction) return;

    const { error } = await supabaseClient
      .from("profiles")
      .update({ is_banned: !user.is_banned })
      .eq("id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      user.is_banned
        ? "Utilisateur débanni."
        : "Utilisateur banni."
    );

    await loadAdminUsers();
  };
});
}

/* Ban profil */

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

async function createAdminNotification(userId, content, link = "notifications.html") {
  await supabaseClient
    .from("notifications")
    .insert({
      user_id: userId,
      type: "admin",
      content,
      link,
      is_read: false
    });
}

async function loadChatRequests() {  
  const box = document.getElementById("adminChatRequests");
  if (!box) return;

  const { data, error } = await supabaseClient
    .from("likes")
    .select(`
      id,
      status,
      payment_note,
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

      <small>Statut : <strong>${r.status}</strong></small>

      <div class="admin-actions">
        <button class="btn ghost" data-accept-request="${r.id}">
          Accepter
        </button>

        <button class="btn danger" data-refuse-request="${r.id}">
          Refuser
        </button>

        <button
          class="btn success"
          data-paid-request="${r.id}"
          data-buyer="${r.requester?.id}"
          data-target="${r.target?.id}"
        >
          Marquer payé
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
      const requestId = btn.dataset.acceptRequest;

      const request = data.find(r => r.id === requestId);

      await supabaseClient
     .from("likes")
        .update({ status: "accepted" })
        .eq("id", requestId);

      await createAdminNotification(
        request.requester.id,
        `Votre demande de chat avec ${request.target?.pseudo || "ce profil"} a été acceptée. Vous pouvez payer puis contacter l’admin WhatsApp.`,
        "liste.html"
      );

      await loadChatRequests();
    };
  });

  box.querySelectorAll("[data-refuse-request]").forEach((btn) => {
    btn.onclick = async () => {
      const requestId = btn.dataset.refuseRequest;

      const request = data.find(r => r.id === requestId);

      await supabaseClient
        .from("likes")
        .update({ status: "refused" })
        .eq("id", requestId);

      await createAdminNotification(
        request.requester.id,
        `Votre demande de chat avec ${request.target?.pseudo || "ce profil"} a été refusée.`,
        "notifications.html"
      );

      await loadChatRequests();
    };
  });

  box.querySelectorAll("[data-paid-request]").forEach((btn) => {
    btn.onclick = async () => {
      const requestId = btn.dataset.paidRequest;
      const buyerId = btn.dataset.buyer;
      const targetId = btn.dataset.target;

      await supabaseClient
        .from("likes")
        .update({
          status: "paid",
          payment_note: "PayPal manuel confirmé"
        })
        .eq("id", requestId);

      await supabaseClient
        .from("manual_payments")
        .insert({
          user_id: buyerId,
          target_id: targetId,
          amount: 5.00,
          method: "paypal",
          status: "paid"
        });

      alert("Paiement marqué comme payé.");
      await loadChatRequests();
      await loadManualPayments();
    };
  });

  box.querySelectorAll("[data-unlock-request]").forEach((btn) => {
    btn.onclick = async () => {
      const requestId = btn.dataset.unlockRequest;
      const buyerId = btn.dataset.buyer;
      const targetId = btn.dataset.target;

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
        .from("likes")
        .update({ status: "unlocked" })
        .eq("id", requestId);

      await createAdminNotification(
        buyerId,
        "Votre chat a été débloqué. Vous pouvez maintenant discuter.",
        "chat.html"
      );

      alert("Chat débloqué !");
      await loadChatRequests();
    };
  });
}

async function loadManualPayments() {
  const table = document.getElementById("manualPaymentsTable");
  if (!table) return;

  const { data, error } = await supabaseClient
    .from("manual_payments")
    .select(`
      amount,
      method,
      status,
      created_at,
      user:user_id (
        pseudo
      ),
      target:target_id (
        pseudo
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    table.innerHTML = `
      <tr>
        <td colspan="5">${error.message}</td>
      </tr>
    `;
    return;
  }

  table.innerHTML = (data || []).map((p) => `
    <tr>
      <td>${p.user?.pseudo || "-"}</td>
      <td>${p.target?.pseudo || "-"}</td>
      <td>${p.amount || 0} €</td>
      <td>${p.method || "paypal"}</td>
      <td>${new Date(p.created_at).toLocaleString()}</td>
    </tr>
  `).join("");
}

async function loadReports() {
  const box = document.getElementById("adminReports");
  if (!box) return;

  const { data, error } = await supabaseClient
    .from("reports")
    .select(`
      id,
      reason,
      status,
      created_at,
      reporter:reporter_id (
        id,
        pseudo
      ),
      reported:reported_id (
        id,
        pseudo
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    box.innerHTML = `<p class="error-msg">${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    box.innerHTML = `<p>Aucun signalement.</p>`;
    return;
  }

  box.innerHTML = data.map((r) => `
    <div class="admin-request-card">
      <p>
        <strong>${r.reporter?.pseudo || "Utilisateur"}</strong>
        a signalé
        <strong>${r.reported?.pseudo || "Profil"}</strong>
      </p>

      <p>${r.reason || "Aucune raison donnée"}</p>
      <small>Statut : ${r.status}</small>

      <div class="admin-actions">
        <button
          class="btn danger"
          data-ban-reported="${r.reported?.id}"
        >
          Bannir profil
        </button>

        <button
          class="btn ghost"
          data-close-report="${r.id}"
        >
          Marquer traité
        </button>
      </div>
    </div>
  `).join("");

  box.querySelectorAll("[data-ban-reported]").forEach((btn) => {
    btn.onclick = async () => {
      const confirmBan = confirm("Confirmer le bannissement ?");
      if (!confirmBan) return;

      await supabaseClient
        .from("profiles")
        .update({ is_banned: true })
        .eq("id", btn.dataset.banReported);

      await loadReports();
      await loadAdminUsers();
    };
  });

  box.querySelectorAll("[data-close-report]").forEach((btn) => {
    btn.onclick = async () => {
      await supabaseClient
        .from("reports")
        .update({ status: "closed" })
        .eq("id", btn.dataset.closeReport);

      await loadReports();
    };
  });
}

const exportUsersCsvBtn = document.getElementById("exportUsersCsvBtn");

exportUsersCsvBtn?.addEventListener("click", async () => {
  const { data: users, error } = await supabaseClient
    .from("profiles")
    .select("id,pseudo,city,gender,looking_for,is_verified,is_banned,is_online,created_at");

  if (error) {
    alert(error.message);
    return;
  }

  const rows = [
    ["ID", "Pseudo", "Ville", "Genre", "Recherche", "Vérifié", "Banni", "En ligne", "Créé le"],
    ...(users || []).map((u) => [
      u.id,
      u.pseudo || "",
      u.city || "",
      u.gender || "",
      u.looking_for || "",
      u.is_verified ? "Oui" : "Non",
      u.is_banned ? "Oui" : "Non",
      u.is_online ? "Oui" : "Non",
      u.created_at || ""
    ])
  ];

  const csv = rows
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "loveconnect-utilisateurs.csv";
  a.click();

  URL.revokeObjectURL(url);
});

async function loadMatches() {

  const { data: likes, error } =
    await supabaseClient
      .from("likes")
      .select("*");

  if (error) {
    console.error(error);
    return;
  }

  const matches = [];

  likes.forEach((like) => {

    const reverse = likes.find(
      (l) =>
        l.liker_id === like.liked_id &&
        l.liked_id === like.liker_id
    );

    if (reverse) {

      const alreadyExists = matches.find(
        (m) =>
          (m.user1 === like.liker_id &&
            m.user2 === like.liked_id) ||

          (m.user1 === like.liked_id &&
            m.user2 === like.liker_id)
      );

      if (!alreadyExists) {

        matches.push({
          user1: like.liker_id,
          user2: like.liked_id
        });

      }
    }

  });

  renderMatches(matches);
}

function renderMatches(matches) {

  const matchesList =
    document.getElementById("matchesList");

  if (!matchesList) return;

  matchesList.innerHTML = "";

  matches.forEach((match) => {

    const div =
      document.createElement("div");

    div.className = "admin-match-card";

    div.innerHTML = `

      <div class="admin-match-content">

        <p>
          ❤️ Match trouvé
        </p>

        <small>
          ${match.user1}
          ↔
          ${match.user2}
        </small>

        <button
          class="btn success unlock-chat-btn"
          data-user1="${match.user1}"
          data-user2="${match.user2}"
        >
          🔓 Débloquer le chat
        </button>

      </div>
    `;

    const unlockBtn =
      div.querySelector(".unlock-chat-btn");

    unlockBtn?.addEventListener(
      "click",
      async () => {

        const { error } =
          await supabaseClient
            .from("chat_access")
            .insert({
              user_1: match.user1,
              user_2: match.user2,
              active: true
            });

        if (error) {
          alert(error.message);
          return;
        }

        alert("Chat débloqué ❤️");

      }
    );

    matchesList.appendChild(div);

  });

}
loadMatches();