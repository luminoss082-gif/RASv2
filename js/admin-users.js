/* =========================
   ADMIN
========================= */

import { supabaseClient } from "./config.js";
import { createNotification } from "./notifications.js";
import { requireAdmin } from "./admin-guard.js";

/* =========================
   INIT ADMIN USERS
========================= */

export async function initAdminUsers() {
  const adminUsers = document.getElementById("adminUsers");
  if (!adminUsers) return;

  const isAdmin = await requireAdmin();
  if (!isAdmin) return;

  async function loadAdminUsers() {
    const { data: profiles, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement utilisateurs:", error);
      adminUsers.innerHTML = `
        <tr>
          <td colspan="9">Erreur : ${error.message}</td>
        </tr>
      `;
      return;
    }

    adminUsers.innerHTML = "";

    if (!profiles || profiles.length === 0) {
      adminUsers.innerHTML = `
        <tr>
          <td colspan="9">Aucun utilisateur trouvé.</td>
        </tr>
      `;
      return;
    }

    profiles.forEach((p) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
<td>
  <img
    src="${
      p.avatar_url && p.avatar_url.startsWith("http")
        ? p.avatar_url
        : "default-avatar.png"
    }"
    class="chat-avatar"
    onerror="this.src='default-avatar.png'"
  >
</td>

        <td>${p.pseudo || "-"}</td>

        <td>${p.city || "-"}</td>

        <td>${p.role || "user"}</td>

        <td>${p.is_verified ? "✔️" : ""}</td>

        <td>${p.is_banned ? "Oui" : "Non"}</td>

        <td>

          <button class="btn verify" data-verify="${p.id}">
            ${p.is_verified ? "Retirer Vérifié" : "Vérifier"}
          </button>

          <button class="btn danger" data-ban="${p.id}">
            ${p.is_banned ? "Débannir" : "Bannir"}
          </button>
        </td>
      `;
      const unlockChatBtn = document.getElementById("unlockChatBtn");

if (unlockChatBtn) {
  unlockChatBtn.onclick = async () => {
    const buyerId = document.getElementById("buyerId").value.trim();
    const targetId = document.getElementById("targetId").value.trim();

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

    alert("Chat débloqué uniquement avec ce profil !");
  };
}

      adminUsers.appendChild(tr);
    });

  
    /* =========================
       BAN BUTTON
    ========================= */

    adminUsers.querySelectorAll("[data-ban]").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.getAttribute("data-ban");

        const { data: user, error } = await supabaseClient
          .from("profiles")
          .select("is_banned")
          .eq("id", id)
          .single();

        if (error) {
          alert(error.message);
          return;
        }

        const banned = !user.is_banned;

        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({ is_banned: banned })
          .eq("id", id);

        if (updateError) {
          alert(updateError.message);
          return;
        }

        await createNotification(
          id,
          "system",
          banned
            ? "Votre compte a été banni"
            : "Votre bannissement a été levé",
          "index.html"
        );

        await loadAdminUsers();
      };
    });

    /* =========================
       VERIFY BUTTON
    ========================= */

    adminUsers.querySelectorAll("[data-verify]").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.getAttribute("data-verify");

        const { data: user, error } = await supabaseClient
          .from("profiles")
          .select("is_verified")
          .eq("id", id)
          .single();

        if (error) {
          alert(error.message);
          return;
        }

        const verified = !user.is_verified;

        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({ is_verified: verified })
          .eq("id", id);

        if (updateError) {
          alert(updateError.message);
          return;
        }

        await createNotification(
          id,
          "system",
          verified
            ? "Votre profil est maintenant vérifié"
            : "Votre badge vérifié a été retiré",
          "profile.html?id=" + id
        );

        await loadAdminUsers();
      };
    });
  }

  await loadAdminUsers();
}

const unlockChatBtn = document.getElementById("unlockChatBtn");

if (unlockChatBtn) {
  unlockChatBtn.onclick = async () => {
    const buyerId = document.getElementById("buyerId").value.trim();
    const targetId = document.getElementById("targetId").value.trim();

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