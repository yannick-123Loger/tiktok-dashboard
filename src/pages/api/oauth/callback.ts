// src/pages/api/oauth/callback.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { exchangeCodeForToken } from "@/lib/tiktok";
import { upsertCreatorByKey } from "@/lib/airtable";

function pickString(v: unknown): string | null {
  return typeof v === "string" && v.length ? v : null;
}

function isoInSecondsFromNow(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const code = pickString(req.query.code);
    const state = pickString(req.query.state);

    if (!code) return res.status(400).json({ error: "missing_code" });
    if (!state) return res.status(400).json({ error: "missing_state" });

    // state attendu: "toulouse|<random>"
    const creator_key = state.split("|")[0]?.trim();
    if (!creator_key) return res.status(400).json({ error: "invalid_state" });

    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/oauth/callback`;

    const token = await exchangeCodeForToken({
      code,
      redirectUri,
      codeVerifier: null, // si tu actives PKCE plus tard, on le mettra ici
    });

    // token shape attendu:
    // { access_token, refresh_token, expires_in, refresh_expires_in, open_id, scope, token_type }
    const expires_in = Number(token?.expires_in ?? 0);
    const refresh_expires_in = Number(token?.refresh_expires_in ?? 0);

    const expires_at = expires_in > 0 ? isoInSecondsFromNow(expires_in) : undefined;
    const refresh_expires_at =
      refresh_expires_in > 0 ? isoInSecondsFromNow(refresh_expires_in) : undefined;

    await upsertCreatorByKey({
      creator_key,
      open_id: token?.open_id,
      access_token: token?.access_token,
      refresh_token: token?.refresh_token,
      scope: token?.scope,
      token_type: token?.token_type,
      expires_at,
      refresh_expires_at,
      is_connected: true,
    });

    // IMPORTANT: ne jamais afficher les tokens. On redirige.
return res.redirect(
  302,
  `/publish?connected=1&creator_key=${encodeURIComponent(creator_key)}`
);  } catch (e: any) {
    // Log détaillé côté Vercel
    console.error("OAuth callback error:", e?.response?.data || e?.message || e);

    // Réponse safe (sans secrets)
    return res.status(500).json({
      error: "callback_failed",
      details: e?.response?.data || e?.message || String(e),
    });
  }
}