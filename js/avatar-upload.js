import { supabaseClient } from "./config.js";

/* =========================
   UPLOAD AVATAR
========================= */

export async function uploadAvatar(userId, file) {

  if (!file) return null;

  const fileExt =
    file.name.split(".").pop();

  const fileName =
    `${userId}-${Date.now()}.${fileExt}`;

  const filePath = fileName;

  const { error } =
    await supabaseClient.storage
      .from("avatars")
      .upload(filePath, file, {
        upsert: true
      });

  if (error) {
    throw error;
  }

  const { data } =
    supabaseClient.storage
      .from("avatars")
      .getPublicUrl(filePath);

  return data.publicUrl;
}

/* =========================
   PREVIEW AVATAR
========================= */

export function initAvatarPreview() {

  const avatarInput =
    document.getElementById("avatar");

  const preview =
    document.getElementById("avatarPreview");

  if (!avatarInput || !preview) return;

  avatarInput.addEventListener(
    "change",
    (e) => {

      const file =
        e.target.files?.[0];

      if (!file) return;

      const reader =
        new FileReader();

      reader.onload = () => {

        preview.src =
          reader.result;

      };

      reader.readAsDataURL(file);

    }
  );

}