/* ==========================================================================
   universalgroup.uz — Cloud Backend & Deployment Configuration
   --------------------------------------------------------------------------
   Supports three real-time persistent backends out of the box:
   1. Firebase Realtime Database (REST + EventSource real-time stream)
   2. Supabase (PostgREST + Realtime polling/stream)
   3. Built-in / Hosted REST + SSE API (`/api/state` & `/api/lockout`)

   To connect your public Firebase or Supabase project, set the URL/keys below
   or configure them directly inside the Admin Panel -> Cloud & Security tab.
   ========================================================================== */
window.UG_CLOUD_CONFIG = {
  // Priority order: 'auto' tries custom configured Firebase/Supabase first,
  // then same-origin `/api/state` backend, with real-time BroadcastChannel +
  // cloud storage sync.
  provider: 'auto', // 'auto' | 'firebase' | 'supabase' | 'api'

  // 1. Firebase Realtime Database config (e.g. "https://universalgroup-uz-default-rtdb.firebaseio.com")
  firebase: {
    databaseURL: '',
    apiKey: '',
  },

  // 2. Supabase config (e.g. "https://xyzcompany.supabase.co")
  supabase: {
    url: '',
    anonKey: '',
    table: 'ug_app_state',
  },

  // 3. Same-origin or custom REST + SSE API endpoint (powered by server.py / Vercel / Netlify function)
  api: {
    baseUrl: '/api',
  },

  // Default 8-character admin password: "Admin/26" (stored in the database so it can be changed later)
  defaultPasscode: 'Admin/26',
};
