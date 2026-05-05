/* =========================
   BLOCKS
========================= */

import { supabaseClient } from "./config.js";

export async function blockUser(blocker, blocked) {
  return await supabaseClient.from("blocks").insert({ blocker, blocked });
}
