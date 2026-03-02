// src/lib/tiktok.ts
type ExchangeArgs = {
  code: string;
  redirectUri: string;
  codeVerifier: string | null;
};

export async function exchangeCodeForToken({ code, redirectUri, codeVerifier }: ExchangeArgs) {
  const params = new URLSearchParams();
  params.set("client_key", process.env.TIKTOK_CLIENT_KEY || "");
  params.set("client_secret", process.env.TIKTOK_CLIENT_SECRET || "");
  params.set("code", code);
  params.set("grant_type", "authorization_code");
  params.set("redirect_uri", redirectUri);

  // PKCE si utilisé
  if (codeVerifier) params.set("code_verifier", codeVerifier);

  const r = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await r.json();
  if (!r.ok) {
    const err = new Error(`Token exchange failed: ${r.status}`);
    (err as any).response = { data };
    throw err;
  }
  return data;
}