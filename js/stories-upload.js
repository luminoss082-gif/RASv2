/* =========================
   UPLOAD STORY
========================= */

import { supabaseClient } from "./config.js";
import { loadStories } from "./stories.js";

export function initStoriesUpload() {
  const addStoryBtn = document.getElementById("addStoryBtn");
  if (!addStoryBtn) return;

  addStoryBtn.onclick = async () => {
    const text = prompt("Texte de ta story (optionnel) :") || "";

    const file = await new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => resolve(input.files[0]);
      input.click();
    });

    if (!file) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("stories")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert(uploadError.message);
      return;
    }

    const { data: publicURL } = supabaseClient.storage.from("stories").getPublicUrl(filePath);

    await supabaseClient.from("stories").insert({
      user_id: user.id,
      image_url: publicURL.publicUrl,
      text
    });

    loadStories();
  };
}
