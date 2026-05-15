
/* =========================
   APP INIT
========================= */

import { supabaseClient } from "./config.js";

import {
  autoLogin,
  initCurrentUser,
  checkExistingProfile,
  initHomeRedirect
} from "./auth.js";

import { initTheme } from "./theme.js";

import {
  loadPersistentNotifications,
  initNotificationUI
} from "./notifications.js";

import {
  registerServiceWorker,
  initPushRegistration
} from "./push.js";

import {
  initRealtimeNotifications,
  initSupportRealtime
} from "./realtime.js";

import { initAvatarPreview } from "./avatar-upload.js?v=2";

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

/* =========================
   ONLINE STATUS
========================= */

async function updateOnlineStatus() {

  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  if (!user) return;

  // utilisateur connecté
  await supabaseClient
    .from("profiles")
    .update({
      is_online: true,
      last_seen: new Date().toISOString()
    })
    .eq("id", user.id);

  // mise à jour activité
  setInterval(async () => {

    await supabaseClient
      .from("profiles")
      .update({
        last_seen: new Date().toISOString()
      })
      .eq("id", user.id);

  }, 30000);

  // utilisateur quitte
  window.addEventListener("beforeunload", async () => {

    await supabaseClient
      .from("profiles")
      .update({
        is_online: false,
        last_seen: new Date().toISOString()
      })
      .eq("id", user.id);

  });

}

/* =========================
   ADMIN LINK
========================= */

async function protectAdminUI() {

  const adminLink =
    document.getElementById("adminLink");

  if (!adminLink) return;

  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  // pas connecté
  if (!user) {
    adminLink.style.display = "none";
    return;
  }

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  // pas admin
  if (!profile || profile.role !== "admin") {
    adminLink.style.display = "none";
  }

}

/* =========================
   ADMIN PAGE
========================= */

function initAdminPage() {

  const adminUsers =
    document.getElementById("adminUsers");

  if (adminUsers) {
    initAdminUsers();
  }

}

/* =========================
   APP START
========================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    try {

      /* thème */
      initTheme();

      /* service worker */
      registerServiceWorker();

      /* auth */
      await autoLogin();

      await initCurrentUser();

      await checkExistingProfile();

      /* online */
      await updateOnlineStatus();

      /* notifications */
      await loadPersistentNotifications();

      initNotificationUI();

      initRealtimeNotifications();

      /* support realtime */
      initSupportRealtime();

      /* push */
      initPushRegistration();

      /* admin */
      await protectAdminUI();

      initAdminPage();

      /* profile */
      initAvatarPreview();

      initCreateProfile();

      initEditProfile();

      initPhotosUpload();

      loadMyProfileCard();

      /* profils */
      initProfilesList();

      initProfileDetail();

      initProfilePage();

      /* stories */
      initStories();

      initStoriesUpload();

      /* chat */
      initChat();

      /* support */
      initSupport();

      /* home */
      initHomeRedirect();

      console.log("✅ App initialisée");

    } catch (err) {

      console.error(
        "❌ Erreur app-init:",
        err
      );

    }

  }
);