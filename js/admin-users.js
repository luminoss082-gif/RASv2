/* =========================
   ADMIN
========================= */

import { supabaseClient } from "./config.js";
import { createNotification } from "./notifications.js";
import { requireAdmin } from "./admin-guard.js";

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
        <td><img src="${p.avatar_url}" class="chat-avatar"></td>
        <td>${p.pseudo}</td>
        <td>${p.is_premium ? "Oui" : "Non"}</td>
        <td>${p.is_verified ? "✔️" : ""}</td>
        <td>${p.is_banned ? "Oui" : "Non"}</td>
        <td>
          <button data-premium="${p.id}" class="btn ghost">${p.is_premium ? "Retirer Premium" : "Premium"}</button>
          <button data-ban="${p.id}" class="btn danger">${p.is_banned ? "Débannir" : "Bannir"}</button>
          <button data-verify="${p.id}" class="btn">${p.is_verified ? "Retirer ✔️" : "Vérifier ✔️"}</button>
        </td>
      `;
      adminUsers.appendChild(tr);
    });

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
