/* =========================
   ADMIN
========================= */

import { supabaseClient } from "./config.js";
import { createNotification } from "./notifications.js";
import { requireAdmin } from "./admin-guard.js";

function getPremiumRemainingDays(dateString) {

  if (!dateString) return "-";

  const now = new Date();
  const end = new Date(dateString);

  const diff = end - now;

  if (diff <= 0) return "Expiré";

  const days = Math.ceil(
    diff / (1000 * 60 * 60 * 24)
  );

  return `${days} jours`;
}
export async function initAdminUsers() {
  const adminUsers = document.getElementById("adminUsers");
  if (!adminUsers) return;

  const isAdmin = await requireAdmin();
  if (!isAdmin) return;

  

  async function loadAdminUsers() {
    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    adminUsers.innerHTML = "";

    (profiles || []).forEach((p) => {
      const tr = document.createElement("tr");
   tr.innerHTML = `
  <td>
    <img
      src="${p.avatar_url || 'default-avatar.png'}"
      class="chat-avatar"
      onerror="this.src='default-avatar.png'"
    >
  </td>

  <td>${p.pseudo}</td>

  <td>
    ${p.is_premium ? "Oui" : "Non"}
  </td>

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
  </td>
  
  <td>  
    <button class="btn ghost" data-verify="${p.id}">
      ${p.is_verified ? "Retirer Vérifié" : "Vérifier"}
    </button>
  </td>
  
  <td>
    <button class="btn ghost" data-ban="${p.id}">
      ${p.is_banned ? "Lever Bannissement" : "Bannir"}
    </button>
  </td>
`;
      adminUsers.appendChild(tr);
    }
    );  
      

    adminUsers.querySelectorAll("[data-premium]").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.getAttribute("data-premium");
        const { data: user } = await supabaseClient.from("profiles").select("is_premium").eq("id", id).single();
        await supabaseClient.from("profiles").update({ is_premium: !user.is_premium }).eq("id", id);
        await createNotification(id, "system", user.is_premium ? "Votre Premium a été retiré" : "Vous êtes maintenant Premium", "premium.html");
        loadAdminUsers();
      };
    });

    adminUsers.querySelectorAll("[data-ban]").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.getAttribute("data-ban");
        const { data: user } = await supabaseClient.from("profiles").select("is_banned").eq("id", id).single();
        await supabaseClient.from("profiles").update({ is_banned: !user.is_banned }).eq("id", id);
        await createNotification(id, "system", user.is_banned ? "Votre bannissement a été levé" : "Votre compte a été banni", "home.html");
        loadAdminUsers();
      };
    });

    adminUsers.querySelectorAll("[data-verify]").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.getAttribute("data-verify");
        const { data: user } = await supabaseClient.from("profiles").select("is_verified").eq("id", id).single();
        await supabaseClient.from("profiles").update({ is_verified: !user.is_verified }).eq("id", id);
        await createNotification(id, "system", user.is_verified ? "Votre badge vérifié a été retiré" : "Votre profil est maintenant vérifié", "profile.html?id=" + id);
        loadAdminUsers();
      };
    });
  }

  loadAdminUsers();
}

/* =========================
   PREMIUM
========================= */
const premiumEnabled = !user.is_premium;

await supabaseClient
  .from("profiles")
  .update({
    is_premium: premiumEnabled,
    premium_expires_at: premiumEnabled
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null
  })
  .eq("id", id);

  