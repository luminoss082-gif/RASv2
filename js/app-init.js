/* =========================
   APP INIT
========================= */

import { autoLogin, initCurrentUser, checkExistingProfile, initHomeRedirect } from "./auth.js";
import { initTheme } from "./theme.js";
import { loadPersistentNotifications, initNotificationUI } from "./notifications.js";
import { registerServiceWorker, initPushRegistration } from "./push.js";
import { initRealtimeNotifications, initSupportRealtime } from "./realtime.js";
import { initAvatarPreview } from "./avatar-upload.js";
import { initCreateProfile } from "./profile-create.js";
import { initEditProfile } from "./profile-edit.js";
import { initPhotosUpload } from "./photos-upload.js";
import { initProfilesList } from "./profiles-list.js";
import { initProfileDetail } from "./profile-detail.js";
import { initStories } from "./stories.js";
import { initStoriesUpload } from "./stories-upload.js";
import { initChat } from "./chat-premium.js";
import { initAdminUsers } from "./admin-users.js";
import { loadMyProfileCard } from "./my-profile-card.js";
import { initProfilePage } from "./profile-carousel.js";
import { initSupport } from "./support.js";


document.addEventListener("DOMContentLoaded", () => {
  const adminTable = document.getElementById("adminUsers");

  if (adminTable) {
    initAdminUsers();
  }
});

initHomeRedirect();
initProfilePage();

async function protectAdminUI() {
  const adminLink = document.getElementById("adminLink");
  if (!adminLink) return;

  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    adminLink.style.display = "none";
    return;
  }

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    adminLink.style.display = "none";
  }
}

(async () => {
  initTheme();
  registerServiceWorker();

  await autoLogin();
  await initCurrentUser();
  await checkExistingProfile();
  await loadPersistentNotifications();
  await protectAdminUI();
  initNotificationUI();
  initRealtimeNotifications();
  initSupportRealtime();
  initPushRegistration();

  initAvatarPreview();
  initCreateProfile();
  initEditProfile();
  initPhotosUpload();
  initProfilesList();
  initProfileDetail();
  initStories();
  initStoriesUpload();
  initChat();
  loadMyProfileCard();
  initSupport();

})();
