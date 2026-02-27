// src/lib/tiktok.ts
export type TikTokTokenResponse = {
  access_token: string;
  expires_in: number;
  open_id: string;
  refresh_token: string;
  refresh_expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
  log_id?: string;
};

const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

export async function exchangeCodeForToken(args: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<TikTokTokenResponse> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    throw new Error("Missing TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET in env.");
  }

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code: args.code,
    grant_type: "authorization_code",
    redirect_uri: args.redirectUri,
    code_verifier: args.codeVerifier,
  });

  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as TikTokTokenResponse;
  return json;
}
