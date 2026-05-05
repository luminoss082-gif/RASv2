/* =========================
   PROFIL PAGE + CAROUSEL PHOTOS
========================= */

import { supabaseClient } from "./config.js";
import { getProfileIdFromUrl } from "./core.js";

export function initProfilePage() {
  document.addEventListener("DOMContentLoaded", async () => {
    const profileDetail = document.getElementById("profileDetail");
    const carouselMainImage = document.getElementById("carouselMainImage");
    const carouselThumbs = document.getElementById("carouselThumbs");
    const prevBtn = document.getElementById("carouselPrev");
    const nextBtn = document.getElementById("carouselNext");

    if (!profileDetail || !carouselMainImage || !carouselThumbs || !prevBtn || !nextBtn) return;

    const profileId = getProfileIdFromUrl();
    if (!profileId) {
      console.warn("Aucun profileId dans l’URL");
      return;
    }

    let photos = [];
    let currentIndex = 0;
    let dragSrcIndex = null;

    async function loadProfilePhotos() {
      const { data, error } = await supabaseClient
        .from("profile_photos")
        .select("*")
        .eq("profile_id", profileId)
        .order("position", { ascending: true });

      if (error) {
        console.error("Erreur chargement photos profil:", error);
        return;
      }

      photos = data || [];

      if (photos.length === 0) {
        carouselMainImage.src = "placeholder.jpg";
        carouselMainImage.alt = "Aucune photo";
        carouselThumbs.innerHTML = "";
        return;
      }

      const primaryIndex = photos.findIndex(p => p.is_primary);
      currentIndex = primaryIndex >= 0 ? primaryIndex : 0;
      renderCarousel();
    }

    function renderCarousel() {
      if (!photos || photos.length === 0) return;

      if (currentIndex < 0) currentIndex = 0;
      if (currentIndex >= photos.length) currentIndex = photos.length - 1;

      const currentPhoto = photos[currentIndex];
      carouselMainImage.src = currentPhoto.image_url;
      carouselMainImage.alt = "Photo de profil";
      carouselThumbs.innerHTML = "";

      photos.forEach((photo, index) => {
        const thumb = document.createElement("div");
        thumb.className = "carousel-thumb";
        thumb.draggable = true;
        thumb.dataset.index = index;

        if (photo.is_primary) thumb.classList.add("primary");
        if (index === currentIndex) thumb.classList.add("active");

        const img = document.createElement("img");
        img.src = photo.image_url;
        img.alt = "Miniature";

        const primaryBadge = document.createElement("span");
        primaryBadge.className = "primary-badge";
        primaryBadge.textContent = "★";

        thumb.appendChild(img);
        thumb.appendChild(primaryBadge);
        carouselThumbs.appendChild(thumb);

        thumb.addEventListener("click", () => {
          currentIndex = index;
          renderCarousel();
        });

        thumb.addEventListener("dragstart", handleDragStart);
        thumb.addEventListener("dragover", handleDragOver);
        thumb.addEventListener("drop", handleDrop);
      });
    }

    function handleDragStart(e) {
      dragSrcIndex = parseInt(e.currentTarget.dataset.index, 10);
      e.dataTransfer.effectAllowed = "move";
    }

    function handleDragOver(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }

    async function handleDrop(e) {
      e.preventDefault();
      const targetIndex = parseInt(e.currentTarget.dataset.index, 10);
      if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;

      const moved = photos.splice(dragSrcIndex, 1)[0];
      photos.splice(targetIndex, 0, moved);
      photos = photos.map((p, idx) => ({ ...p, position: idx }));
      currentIndex = photos.findIndex(p => p.id === moved.id);

      renderCarousel();
      await savePhotoOrder();
      dragSrcIndex = null;
    }

    async function savePhotoOrder() {
      const updates = photos.map(p => ({ id: p.id, position: p.position }));

      const { error } = await supabaseClient
        .from("profile_photos")
        .upsert(updates, { onConflict: "id" });

      if (error) console.error("Erreur sauvegarde ordre photos:", error);
    }

    prevBtn.addEventListener("click", () => {
      if (!photos.length) return;
      currentIndex = (currentIndex - 1 + photos.length) % photos.length;
      renderCarousel();
    });

    nextBtn.addEventListener("click", () => {
      if (!photos.length) return;
      currentIndex = (currentIndex + 1) % photos.length;
      renderCarousel();
    });

    carouselMainImage.addEventListener("dblclick", async () => {
      if (!photos.length) return;

      const currentPhoto = photos[currentIndex];
      photos = photos.map(p => ({ ...p, is_primary: p.id === currentPhoto.id }));
      renderCarousel();

      const { error } = await supabaseClient
        .from("profile_photos")
        .update({ is_primary: false })
        .eq("profile_id", profileId);

      if (error) {
        console.error("Erreur reset is_primary:", error);
        return;
      }

      const { error: error2 } = await supabaseClient
        .from("profile_photos")
        .update({ is_primary: true })
        .eq("id", currentPhoto.id);

      if (error2) console.error("Erreur set is_primary:", error2);

      await supabaseClient
        .from("profiles")
        .update({ avatar_url: currentPhoto.image_url })
        .eq("id", profileId);
    });

    await loadProfilePhotos();
  });
}
