/* =========================
   REPORTS
========================= */

import { supabaseClient } from "./config.js";

export async function reportUser(reporter, target, reason) {
  return await supabaseClient.from("reports").insert({ reporter, target, reason });
}
