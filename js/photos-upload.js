/* =========================
   UPLOAD MULTI-PHOTOS + GALERIE
========================= */

import { supabaseClient } from "./config.js";

export function initPhotosUpload() {
  const photoInput = document.getElementById("photoInput");
  const uploadPhotosBtn = document.getElementById("uploadPhotosBtn");
  const photoGallery = document.getElementById("photoGallery");

  if (uploadPhotosBtn && photoInput) {
    uploadPhotosBtn.onclick = async () => {
      const files = photoInput.files;
      if (!files.length) {
        alert("Choisis au moins une photo.");
        return;
      }

      const { data: { user } } = await supabaseClient.auth.getUser();

      for (let file of files) {
        const ext = file.name.split(".").pop();
        const filePath = `${user.id}-${Date.now()}-${Math.random()}.${ext}`;

        const { error: uploadError } = await supabaseClient.storage
          .from("profile_photos")
          .upload(filePath, file);

        if (uploadError) {
          console.error(uploadError);
          continue;
        }

        const { data: publicURL } = supabaseClient.storage
          .from("profile_photos")
          .getPublicUrl(filePath);

        await supabaseClient.from("profile_photos").insert({
          user_id: user.id,
          image_url: publicURL.publicUrl
        });
      }

      alert("Photos ajoutées !");
      loadUserPhotos();
    };
  }

  if (photoGallery) loadUserPhotos();
}

export async function loadUserPhotos() {
  const photoGallery = document.getElementById("photoGallery");
  if (!photoGallery) return;

  const { data: { user } } = await supabaseClient.auth.getUser();

  const { data: photos } = await supabaseClient
    .from("profile_photos")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  photoGallery.innerHTML = "";

  (photos || []).forEach(p => {
    const div = document.createElement("div");
    div.className = "photo-item";
    div.innerHTML = `
      <img src="${p.image_url}">
      <button class="delete-photo" data-id="${p.id}">×</button>
    `;
    photoGallery.appendChild(div);
  });

  document.querySelectorAll(".delete-photo").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      await supabaseClient.from("profile_photos").delete().eq("id", id);
      loadUserPhotos();
    };
  });
}
