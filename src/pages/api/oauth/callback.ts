// src/pages/api/oauth/callback.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { exchangeCodeForToken } from "../../../lib/tiktok";
import { upsertCreatorByKey } from "../../../lib/airtable";

function readCookie(cookieHeader: string, name: string): string | undefined {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.split("=")[1];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
  const state = Array.isArray(req.query.state)
    ? req.query.state[0]
    : req.query.state;

  if (!code || !state) {
    return res.status(400).json({ error: "missing_code_or_state" });
  }

  const [creatorKey, csrf] = state.split("|");
  if (!creatorKey || !csrf) {
    return res.status(400).json({ error: "invalid_state" });
  }

  const cookie = req.headers.cookie || "";
  const csrfCookie = readCookie(cookie, "tt_csrf");
  const codeVerifier = readCookie(cookie, "tt_pkce");

  if (!csrfCookie || csrfCookie !== csrf) {
    return res.status(400).json({ error: "csrf_mismatch" });
  }
  if (!codeVerifier) {
    return res.status(400).json({ error: "missing_pkce_verifier" });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const normalizedBaseUrl = baseUrl?.replace(/\/+$/, "");
  if (!normalizedBaseUrl) {
    return res.status(500).json({ error: "missing_base_url" });
  }
  const isSecure = normalizedBaseUrl.startsWith("https://");
  const clearCookieAttrs = `Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecure ? "; Secure" : ""}`;
  res.setHeader("Set-Cookie", [
    `tt_csrf=; ${clearCookieAttrs}`,
    `tt_pkce=; ${clearCookieAttrs}`,
  ]);

  const token = await exchangeCodeForToken({
    code,
    redirectUri: `${normalizedBaseUrl}/api/oauth/callback`,
    codeVerifier,
  });

  if (token.error) {
    return res.status(400).json(token);
  }

  const now = Date.now();
  const expiresAt = new Date(now + token.expires_in * 1000).toISOString();
  const refreshExpiresAt = new Date(now + token.refresh_expires_in * 1000).toISOString();

  await upsertCreatorByKey({
    creator_key: creatorKey,
    open_id: token.open_id,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: expiresAt,
    refresh_expires_at: refreshExpiresAt,
    scope: token.scope,
    token_type: token.token_type,
    is_connected: true,
  });

  res.redirect(`${normalizedBaseUrl}/?creator_key=${encodeURIComponent(creatorKey)}&connected=1`);
}
