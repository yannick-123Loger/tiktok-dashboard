// src/pages/api/oauth/start.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

function toBase64Url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const creatorKey = Array.isArray(req.query.creator_key)
    ? req.query.creator_key[0]
    : req.query.creator_key;

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const normalizedBaseUrl = baseUrl?.replace(/\/+$/, "");

  if (!clientKey || typeof creatorKey !== "string" || !normalizedBaseUrl) {
    return res.status(400).json({ error: "invalid_request" });
  }

  const csrf = crypto.randomBytes(16).toString("hex");
  const state = `${creatorKey}|${csrf}`;
  const codeVerifier = toBase64Url(crypto.randomBytes(64));
  const codeChallenge = toBase64Url(
    crypto.createHash("sha256").update(codeVerifier).digest(),
  );
  const isSecure = normalizedBaseUrl.startsWith("https://");
  const cookieAttrs = `Path=/; HttpOnly; SameSite=Lax; Max-Age=600${isSecure ? "; Secure" : ""}`;

  res.setHeader("Set-Cookie", [
    `tt_csrf=${csrf}; ${cookieAttrs}`,
    `tt_pkce=${codeVerifier}; ${cookieAttrs}`,
  ]);

  const redirectUri = `${normalizedBaseUrl}/api/oauth/callback`;

  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: "code",
    scope: "user.info.basic,video.upload,video.publish",
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    disable_auto_auth: "1",
  });

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  res.redirect(authUrl);
}
