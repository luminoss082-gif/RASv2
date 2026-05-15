
import { requireAdmin } from "./admin-guard.js";
import { supabaseClient } from "./config.js";

const isAdmin = await requireAdmin();
if (!isAdmin) throw new Error("Accès refusé");

const adminUsers = document.getElementById("adminUsers");
const statUsers = document.getElementById("statUsers");
const statOnline = document.getElementById("statOnline");
const statVerified = document.getElementById("statVerified");
const statBanned = document.getElementById("statBanned");
const statPayments = document.getElementById("statPayments");
const statTickets = document.getElementById("statTickets");

const adminSearch = document.getElementById("adminSearch");

const unlockChatBtn =
  document.getElementById("unlockChatBtn");

const sendGlobalNotifBtn =
  document.getElementById("sendGlobalNotifBtn");

async function loadAdminUsers() {

  const { data: users } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (!users) return;

  statUsers.textContent = users.length;

  statOnline.textContent =
    users.filter(u => u.is_online).length;

  statVerified.textContent =
    users.filter(u => u.is_verified).length;

  statBanned.textContent =
    users.filter(u => u.is_banned).length;

  renderUsers(users);

}

function renderUsers(users) {

  adminUsers.innerHTML = "";

  users.forEach((u) => {

    const tr =
      document.createElement("tr");

    tr.innerHTML = `
      <td>
        <img
          src="${
            u.avatar_url ||
            'assets/default-avatar.png'
          }"
          class="chat-avatar"
          onerror="this.src='assets/default-avatar.png'"
        >
      </td>

      <td>${u.pseudo || "Profil"}</td>

      <td>${u.city || "-"}</td>

      <td>
        ${
          u.is_online
            ? "🟢"
            : "⚫"
        }
      </td>

      <td>

        <button
          class="btn ghost verify-btn"
          data-id="${u.id}"
        >
          ${
            u.is_verified
              ? "Retirer vérif"
              : "Vérifier"
          }
        </button>

        <button
          class="btn danger ban-btn"
          data-id="${u.id}"
        >
          ${
            u.is_banned
              ? "Débannir"
              : "Bannir"
          }
        </button>

      </td>
    `;

    adminUsers.appendChild(tr);

  });

  bindActions(users);

}

function bindActions(users) {

  document
    .querySelectorAll(".verify-btn")
    .forEach(btn => {

      btn.onclick = async () => {

        const user =
          users.find(
            u => u.id === btn.dataset.id
          );

        await supabaseClient
          .from("profiles")
          .update({
            is_verified:
              !user.is_verified
          })
          .eq("id", user.id);

        loadAdminUsers();

      };

    });

  document
    .querySelectorAll(".ban-btn")
    .forEach(btn => {

      btn.onclick = async () => {

        const user =
          users.find(
            u => u.id === btn.dataset.id
          );

        await supabaseClient
          .from("profiles")
          .update({
            is_banned:
              !user.is_banned
          })
          .eq("id", user.id);

        loadAdminUsers();

      };

    });

}

unlockChatBtn?.addEventListener(
  "click",
  async () => {

    const buyerId =
      document.getElementById("buyerId").value;

    const targetId =
      document.getElementById("targetId").value;

    if (!buyerId || !targetId) {
      alert("Champs manquants");
      return;
    }

    await supabaseClient
      .from("chat_access")
      .insert({
        buyer_id: buyerId,
        target_id: targetId
      });

    alert("Chat débloqué");

  }
);

sendGlobalNotifBtn?.addEventListener(
  "click",
  async () => {

    const text =
      document.getElementById(
        "globalNotifText"
      ).value;

    if (!text) return;

    const { data: users } =
      await supabaseClient
        .from("profiles")
        .select("id");

    for (const user of users) {

      await supabaseClient
        .from("notifications")
        .insert({
          user_id: user.id,
          type: "admin",
          content: text
        });

    }

    alert("Notification envoyée");

  }
);

adminSearch?.addEventListener(
  "input",
  async (e) => {

    const value =
      e.target.value.toLowerCase();

    const { data: users } =
      await supabaseClient
        .from("profiles")
        .select("*");

    const filtered =
      users.filter((u) => {

        return (
          (u.pseudo || "")
            .toLowerCase()
            .includes(value)
          ||
          (u.city || "")
            .toLowerCase()
            .includes(value)
          ||
          (u.id || "")
            .includes(value)
        );

      });

    renderUsers(filtered);

  }
);

loadAdminUsers();