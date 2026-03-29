// ZoomInfo Client Credentials OAuth Flow
// Exchanges client_id/secret for an access token via ZoomInfo's OAuth endpoint

const ZOOMINFO_TOKEN_URL = 'https://api.zoominfo.com/gtm/oauth/v1/token';
const TOKEN_BUFFER_MS = 60 * 1000; // refresh 60s before actual expiry

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getZoomInfoToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }
  return refreshToken();
}

async function refreshToken(): Promise<string> {
  const clientId = process.env.ZOOMINFO_CLIENT_ID;
  const clientSecret = process.env.ZOOMINFO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'ZOOMINFO_CLIENT_ID and ZOOMINFO_CLIENT_SECRET must be set in .env.local'
    );
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(ZOOMINFO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(
      `ZoomInfo authentication failed (${res.status}): ${errBody || res.statusText}`
    );
  }

  const data = await res.json();

  if (!data.access_token) {
    throw new Error(
      'ZoomInfo token response missing access_token. Response keys: ' +
        Object.keys(data).join(', ')
    );
  }

  cachedToken = data.access_token;
  // Use expires_in from response (in seconds), with a buffer
  const expiresInMs = (data.expires_in || 1000) * 1000;
  tokenExpiresAt = Date.now() + expiresInMs - TOKEN_BUFFER_MS;
  console.log(`[ZoomInfo Auth] Token acquired, expires in ${data.expires_in}s`);

  return cachedToken!;
}

export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiresAt = 0;
}
