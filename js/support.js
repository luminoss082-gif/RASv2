/* =========================
   SUPPORT CHAT REALTIME
========================= */

export function appendSupportMessage(m) {
  const box = document.getElementById("ticketMessages") || document.getElementById("adminTicketMessages");
  if (!box) return;

  const div = document.createElement("div");
  div.className = "msg " + (m.sender_role === "admin" ? "admin" : "me");
  div.innerHTML = `
    ${m.content}<br>
    <small>${new Date(m.created_at).toLocaleString()}</small>
  `;

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}
