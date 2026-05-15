import { supabaseClient } from "./config.js";

export async function uploadAvatar(userId, file) {

  if (!file) return null;

  const fileExt = file.name.split(".").pop();

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