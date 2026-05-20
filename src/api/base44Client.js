import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;
const apiKey = import.meta.env.VITE_BASE44_API_KEY;
const resolvedAppId = appId || import.meta.env.VITE_BASE44_APP_ID;
const resolvedAppBaseUrl = appBaseUrl || import.meta.env.VITE_BASE44_APP_BASE_URL;

//Create a client with authentication required
export const base44 = createClient({
  appId: resolvedAppId,
  token: token || apiKey,
  functionsVersion,
  serverUrl: resolvedAppBaseUrl,
  requiresAuth: false,
  appBaseUrl: resolvedAppBaseUrl
});
