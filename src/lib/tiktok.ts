// src/lib/tiktok.ts

type ExchangeArgs = {
  code: string;
  redirectUri: string;
  codeVerifier: string;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in env.`);
  return v;
}

async function parseJsonSafe(res: Response) {
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch {
    return { raw: txt };
  }
}

export async function exchangeCodeForToken({
  code,
  redirectUri,
  codeVerifier,
}: ExchangeArgs) {
  const params = new URLSearchParams();
  params.set("client_key", mustEnv("TIKTOK_CLIENT_KEY"));
  params.set("client_secret", mustEnv("TIKTOK_CLIENT_SECRET"));
  params.set("code", code);
  params.set("grant_type", "authorization_code");
  params.set("redirect_uri", redirectUri);
  params.set("code_verifier", codeVerifier);

  const r = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await parseJsonSafe(r);

  if (!r.ok) {
    const err = new Error(`Token exchange failed: ${r.status}`);
    (err as any).response = { data };
    throw err;
  }

  return data;
}

/**
 * Query creator info for Content Posting API UX rendering.
 *
 * TikTok docs require API clients to retrieve latest creator info
 * when rendering the "Post to TikTok" page.
 */
export async function queryCreatorInfo(accessToken: string) {
  const r = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({}),
    }
  );

  const data = await parseJsonSafe(r);

  if (!r.ok) {
    const err = new Error(`Creator info query failed: ${r.status}`);
    (err as any).response = { data };
    throw err;
  }

  return data;
}