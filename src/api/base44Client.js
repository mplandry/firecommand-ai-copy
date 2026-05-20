import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Fallback constants for standalone Vercel deployment
const FALLBACK_APP_ID = '6a04b6d8d4bd90d1a37a5dcf';
const FALLBACK_APP_BASE_URL = 'https://tactical-fire-sync.base44.app';
const FALLBACK_API_KEY = '184562d54b774d0395d64306bacf9c4b';

const resolvedAppId = (appId && appId !== 'VITE_BASE44_APP_ID') ? appId : FALLBACK_APP_ID;
const resolvedAppBaseUrl = (appBaseUrl && appBaseUrl !== 'VITE_BASE44_APP_BASE_URL') ? appBaseUrl : FALLBACK_APP_BASE_URL;
const resolvedToken = token || FALLBACK_API_KEY;

//Create a client with authentication required
export const base44 = createClient({
  appId: resolvedAppId,
  token: resolvedToken,
  functionsVersion,
  serverUrl: resolvedAppBaseUrl,
  requiresAuth: false,
  appBaseUrl: resolvedAppBaseUrl
});
