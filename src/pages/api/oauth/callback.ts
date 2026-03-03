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

function readCookie(req: NextApiRequest, name: string): string | null {
  // Next.js pages router: req.cookies est dispo si tu n'as pas désactivé le cookie parser
  const v = (req.cookies?.[name] ?? null) as string | null;
  return typeof v === "string" && v.length ? v : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const code = pickString(req.query.code);
    const state = pickString(req.query.state);

    if (!code) return res.status(400).json({ error: "missing_code" });
    if (!state) return res.status(400).json({ error: "missing_state" });

    // state attendu: "toulouse|<csrf>"
    const [creator_key_raw, csrf_raw] = state.split("|");
    const creator_key = (creator_key_raw || "").trim();
    const csrfFromState = (csrf_raw || "").trim();
    if (!creator_key || !csrfFromState) return res.status(400).json({ error: "invalid_state" });

    // 1) CSRF check (optionnel mais fortement recommandé)
    const csrfCookie = readCookie(req, "tt_csrf");
    if (!csrfCookie || csrfCookie !== csrfFromState) {
      return res.status(400).json({ error: "csrf_mismatch" });
    }

    // 2) PKCE: récupérer le code_verifier stocké dans le cookie
    const codeVerifier = readCookie(req, "tt_pkce");
    if (!codeVerifier) {
      return res.status(400).json({ error: "missing_code_verifier" });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) return res.status(500).json({ error: "missing_base_url" });

    const redirectUri = `${baseUrl}/api/oauth/callback`;

    const token = await exchangeCodeForToken({
      code,
      redirectUri,
      codeVerifier, // ✅ PKCE complet
    });

    const expires_in = Number(token?.expires_in ?? 0);
    const refresh_expires_in = Number(token?.refresh_expires_in ?? 0);

    const expires_at = expires_in > 0 ? isoInSecondsFromNow(expires_in) : undefined;
    const refresh_expires_at = refresh_expires_in > 0 ? isoInSecondsFromNow(refresh_expires_in) : undefined;

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

    // 3) Nettoyage cookies PKCE/CSRF (évite de “rejouer” des vieux verifiers)
    const isSecure = baseUrl.startsWith("https://");
    const cookieAttrs = `Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecure ? "; Secure" : ""}`;

    res.setHeader("Set-Cookie", [
      `tt_csrf=; ${cookieAttrs}`,
      `tt_pkce=; ${cookieAttrs}`,
    ]);

    return res.redirect(302, `/publish?connected=1&creator_key=${encodeURIComponent(creator_key)}`);
  } catch (e: any) {
    console.error("OAuth callback error:", e?.response?.data || e?.message || e);
    return res.status(500).json({
      error: "callback_failed",
      details: e?.response?.data || e?.message || String(e),
    });
  }
}