import { supabaseClient } from "./config.js";
import { requireAdmin } from "./admin-guard.js";

let selectedTicketId = null;

export function initSupport() {
  initUserSupport();
  initAdminSupport();
}

/* =========================
   SUPPORT UTILISATEUR
========================= */

async function initUserSupport() {
  const createTicketForm = document.getElementById("createTicketForm");
  const ticketsList = document.getElementById("ticketsList");

  if (!createTicketForm || !ticketsList) return;

  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    ticketsList.innerHTML = "<p>Vous devez être connecté.</p>";
    return;
  }

  await loadUserTickets(user.id);

  createTicketForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const category = document.getElementById("ticketCategory").value;
    const subject = document.getElementById("ticketSubject").value.trim();

    if (!category || !subject) return;

    const { error } = await supabaseClient
      .from("support_tickets")
      .insert({
        user_id: user.id,
        category,
        subject,
        status: "open"
      });

    if (error) {
      alert(error.message);
      return;
    }

    createTicketForm.reset();
    await loadUserTickets(user.id);
  });

  const messageForm = document.getElementById("ticketMessageForm");

  if (messageForm) {
    messageForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!selectedTicketId) return;

      const input = document.getElementById("ticketMessageInput");
      const content = input.value.trim();

      if (!content) return;

      const { error } = await supabaseClient
        .from("support_messages")
        .insert({
          ticket_id: selectedTicketId,
          sender_id: user.id,
          sender_role: "user",
          content
        });

      if (error) {
        alert(error.message);
        return;
      }

      input.value = "";
      await loadTicketMessages(selectedTicketId, false);
    });
  }
}

async function loadUserTickets(userId) {
  const ticketsList = document.getElementById("ticketsList");

  const { data: tickets, error } = await supabaseClient
    .from("support_tickets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    ticketsList.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  if (!tickets || tickets.length === 0) {
    ticketsList.innerHTML = "<p>Aucun ticket pour le moment.</p>";
    return;
  }

  ticketsList.innerHTML = tickets.map(t => `
    <div class="ticket-item" data-ticket-id="${t.id}">
      <strong>${t.subject}</strong>
      <span class="ticket-badge">${t.status}</span>
      <br>
      <small>${t.category} — ${new Date(t.created_at).toLocaleString()}</small>
    </div>
  `).join("");

  ticketsList.querySelectorAll("[data-ticket-id]").forEach(item => {
    item.onclick = async () => {
      selectedTicketId = item.dataset.ticketId;

      document.querySelectorAll(".ticket-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      document.getElementById("ticketChatSection").classList.remove("hidden");
      document.getElementById("ticketTitle").textContent = item.querySelector("strong").textContent;

      await loadTicketMessages(selectedTicketId, false);
    };
  });
}

/* =========================
   SUPPORT ADMIN
========================= */

async function initAdminSupport() {
  const adminTicketsList = document.getElementById("adminTicketsList");

  if (!adminTicketsList) return;

  const isAdmin = await requireAdmin();
  if (!isAdmin) return;

  await loadAdminTickets();

  document.getElementById("filterCategory")?.addEventListener("change", loadAdminTickets);
  document.getElementById("filterStatus")?.addEventListener("change", loadAdminTickets);

  const adminMessageForm = document.getElementById("adminTicketMessageForm");

  if (adminMessageForm) {
    adminMessageForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!selectedTicketId) return;

      const { data: { user } } = await supabaseClient.auth.getUser();
      const input = document.getElementById("adminTicketMessageInput");
      const content = input.value.trim();

      if (!content) return;

      const { error } = await supabaseClient
        .from("support_messages")
        .insert({
          ticket_id: selectedTicketId,
          sender_id: user.id,
          sender_role: "admin",
          content
        });

      if (error) {
        alert(error.message);
        return;
      }

      input.value = "";
      await loadTicketMessages(selectedTicketId, true);
    });
  }

  document.getElementById("updateStatusBtn")?.addEventListener("click", async () => {
    if (!selectedTicketId) return;

    const status = document.getElementById("adminTicketStatus").value;

    const { error } = await supabaseClient
      .from("support_tickets")
      .update({ status })
      .eq("id", selectedTicketId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadAdminTickets();
  });
}

async function loadAdminTickets() {
  const adminTicketsList = document.getElementById("adminTicketsList");
  const category = document.getElementById("filterCategory")?.value;
  const status = document.getElementById("filterStatus")?.value;

  let query = supabaseClient
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (status) query = query.eq("status", status);

  const { data: tickets, error } = await query;

  if (error) {
    adminTicketsList.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  if (!tickets || tickets.length === 0) {
    adminTicketsList.innerHTML = "<p>Aucun ticket reçu.</p>";
    return;
  }

  adminTicketsList.innerHTML = tickets.map(t => `
    <div class="ticket-item" data-ticket-id="${t.id}">
      <strong>${t.subject}</strong>
      <span class="ticket-badge">${t.status}</span>
      <br>
      <small>${t.category} — ${new Date(t.created_at).toLocaleString()}</small>
    </div>
  `).join("");

  adminTicketsList.querySelectorAll("[data-ticket-id]").forEach(item => {
    item.onclick = async () => {
      selectedTicketId = item.dataset.ticketId;

      document.querySelectorAll(".ticket-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      document.getElementById("adminTicketChatSection").classList.remove("hidden");
      document.getElementById("adminTicketTitle").textContent = item.querySelector("strong").textContent;

      await loadTicketMessages(selectedTicketId, true);
    };
  });
}

/* =========================
   MESSAGES
========================= */

async function loadTicketMessages(ticketId, isAdminPage) {
  const box = isAdminPage
    ? document.getElementById("adminTicketMessages")
    : document.getElementById("ticketMessages");

  if (!box) return;

  const { data: messages, error } = await supabaseClient
    .from("support_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) {
    box.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  box.innerHTML = (messages || []).map(m => `
    <div class="msg ${m.sender_role === "admin" ? "admin" : "me"}">
      ${m.content}
      <br>
      <small>${new Date(m.created_at).toLocaleString()}</small>
    </div>
  `).join("");

  box.scrollTop = box.scrollHeight;
}
export function appendSupportMessage(m) {
  const box =
    document.getElementById("ticketMessages") ||
    document.getElementById("adminTicketMessages");

  if (!box) return;

  const div = document.createElement("div");
  div.className = "msg " + (m.sender_role === "admin" ? "admin" : "me");

  div.innerHTML = `
    ${m.content}
    <br>
    <small>${new Date(m.created_at).toLocaleString()}</small>
  `;

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}