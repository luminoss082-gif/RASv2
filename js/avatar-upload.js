/* =========================
   PREVIEW + UPLOAD AVATAR
========================= */

import { supabaseClient } from "./config.js";

export function initAvatarPreview() {
  const avatarInput = document.getElementById("avatar");
  if (!avatarInput) return;

  avatarInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const preview = document.getElementById("preview");
    if (preview) preview.src = URL.createObjectURL(file);
  });
}

export async function uploadAvatar(userId, avatarFile) {
  if (!avatarFile || avatarFile.size <= 0) return null;

  const fileExt = avatarFile.name.split(".").pop();
  const filePath = `${userId}/avatar.${fileExt}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("avatars")
    .upload(filePath, avatarFile, {
      upsert: true,
      contentType: avatarFile.type
    });

  if (uploadError) throw uploadError;

  const { data } = supabaseClient.storage
    .from("avatars")
    .getPublicUrl(filePath);

  return data.publicUrl;
}