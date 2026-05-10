/* =========================
   ADMIN
========================= */

import { supabaseClient } from "./config.js";
import { createNotification } from "./notifications.js";
import { requireAdmin } from "./admin-guard.js";

/* =========================
   PREMIUM DAYS
========================= */

function getPremiumRemainingDays(dateString) {
  if (!dateString) return "-";

  const now = new Date();
  const end = new Date(dateString);
  const diff = end - now;

  if (diff <= 0) return "Expiré";

  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return `${days} jours`;
}

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
            src="${p.avatar_url || "default-avatar.png"}"
            class="chat-avatar"
            onerror="this.src='default-avatar.png'"
          >
        </td>

        <td>${p.pseudo || "-"}</td>

        <td>${p.city || "-"}</td>

        <td>${p.role || "user"}</td>

        <td>${p.is_premium ? "Oui" : "Non"}</td>

        <td>
          ${p.is_premium
            ? getPremiumRemainingDays(p.premium_expires_at)
            : "-"
          }
        </td>

        <td>${p.is_verified ? "✔️" : ""}</td>

        <td>${p.is_banned ? "Oui" : "Non"}</td>

        <td>
          <button class="btn ghost" data-premium="${p.id}">
            ${p.is_premium ? "Retirer Premium" : "Rendre Premium"}
          </button>

          <button class="btn verify" data-verify="${p.id}">
            ${p.is_verified ? "Retirer Vérifié" : "Vérifier"}
          </button>

          <button class="btn danger" data-ban="${p.id}">
            ${p.is_banned ? "Débannir" : "Bannir"}
          </button>
        </td>
      `;

      adminUsers.appendChild(tr);
    });

    /* =========================
       PREMIUM BUTTON
    ========================= */

    adminUsers.querySelectorAll("[data-premium]").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.getAttribute("data-premium");

        const { data: user, error } = await supabaseClient
          .from("profiles")
          .select("is_premium")
          .eq("id", id)
          .single();

        if (error) {
          alert(error.message);
          return;
        }

        const premiumEnabled = !user.is_premium;

        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({
            is_premium: premiumEnabled,
            premium_expires_at: premiumEnabled
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
              : null
          })
          .eq("id", id);

        if (updateError) {
          alert(updateError.message);
          return;
        }

        await createNotification(
          id,
          "system",
          premiumEnabled
            ? "Vous êtes maintenant Premium pour 30 jours"
            : "Votre Premium a été retiré",
          "premium.html"
        );

        await loadAdminUsers();
      };
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