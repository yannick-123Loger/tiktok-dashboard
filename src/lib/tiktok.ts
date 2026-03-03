// src/lib/tiktok.ts
type ExchangeArgs = {
  code: string;
  redirectUri: string;
  codeVerifier: string; // ✅ PKCE obligatoire
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in env.`);
  return v;
}

export async function exchangeCodeForToken({ code, redirectUri, codeVerifier }: ExchangeArgs) {
  const params = new URLSearchParams();
  params.set("client_key", mustEnv("TIKTOK_CLIENT_KEY"));
  params.set("client_secret", mustEnv("TIKTOK_CLIENT_SECRET"));
  params.set("code", code);
  params.set("grant_type", "authorization_code");
  params.set("redirect_uri", redirectUri);
  params.set("code_verifier", codeVerifier); // ✅ toujours envoyé

  const r = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const txt = await r.text();
  let data: any;
  try {
    data = JSON.parse(txt);
  } catch {
    data = { raw: txt };
  }

  if (!r.ok) {
    const err = new Error(`Token exchange failed: ${r.status}`);
    (err as any).response = { data };
    throw err;
  }

  return data;
}