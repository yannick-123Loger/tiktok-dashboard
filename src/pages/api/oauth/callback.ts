// src/pages/api/oauth/callback.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { exchangeCodeForToken } from "@/lib/tiktok";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : null;
    const state = typeof req.query.state === "string" ? req.query.state : null;

    if (!code) {
      return res.status(400).json({ error: "missing_code" });
    }
    if (!state) {
      return res.status(400).json({ error: "missing_state" });
    }

    // IMPORTANT: si tu utilises PKCE, il faut récupérer code_verifier depuis un cookie.
    // Pour l'instant, on le passe à null si tu n'as pas PKCE actif.
    const token = await exchangeCodeForToken({
      code,
      redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/oauth/callback`,
      codeVerifier: null, // <-- si PKCE, on le remplace ensuite
    });

    // Pour valider le flow: on renvoie le token en JSON (tu pourras remplacer par Airtable après)
    return res.status(200).json({
      ok: true,
      state,
      token,
    });
  } catch (e: any) {
    console.error("OAuth callback error:", e?.response?.data || e?.message || e);
    return res.status(500).json({
      error: "callback_failed",
      details: e?.response?.data || e?.message || String(e),
    });
  }
}