/* =========================
   CONFIG SUPABASE
========================= */

export const SUPABASE_URL = "https://ulfkjmdhryaulesxlbxf.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZmtqbWRocnlhdWxlc3hsYnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MzU2NTIsImV4cCI6MjA5MzQxMTY1Mn0.RHtLzxyn7goc7P04txvWzzmJlsWnpwJPM7NH-w2i8CQ";
export const VAPID_PUBLIC_KEY = "BL4oHR9A9IEWN1NsvBm8fjsWnA-ZvICVy3Sx-9SvB365URDsamvzPbr8Sqz2VJ9lGBe_yUeXso5IjLwOu05d3RY";
export const ADMIN_ID = "";
export const EDGE_FUNCTION_PUSH_URL = "https://ulfkjmdhryaulesxlbxf.supabase.co/functions/v1/sendPush-ts";

export const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;
window.supabase = supabaseClient;

console.log("Supabase initialisé :", supabaseClient);
