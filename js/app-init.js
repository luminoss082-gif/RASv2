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
import { requireAdmin } from "./admin-guard.js";

initHomeRedirect();
initProfilePage();

(async () => {
  initTheme();
  registerServiceWorker();

  await autoLogin();
  await initCurrentUser();
  await checkExistingProfile();
  await loadPersistentNotifications();

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
  initAdminUsers();
  loadMyProfileCard();
  requireAdmin();
})();
