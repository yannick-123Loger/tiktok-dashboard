// src/pages/api/tiktok/creator-info.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getCreatorByKey } from "@/lib/airtable";
import { queryCreatorInfo } from "@/lib/tiktok";

function pickString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length ? v.trim() : null;
}

function pickBoolean(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  return null;
}

function pickNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function pickStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "GET") {
      return res
        .status(405)
        .json({ ok: false, error: "method_not_allowed" });
    }

    const creator_key = pickString(req.query.creator_key);
    if (!creator_key) {
      return res
        .status(400)
        .json({ ok: false, error: "missing_creator_key" });
    }

    const creator = await getCreatorByKey(creator_key);
    if (!creator) {
      return res
        .status(404)
        .json({ ok: false, error: "creator_not_found" });
    }

    if (!creator.access_token) {
      return res
        .status(400)
        .json({ ok: false, error: "missing_creator_access_token" });
    }

    const raw = await queryCreatorInfo(creator.access_token);

    // TikTok usually returns { data: {...}, error: {...} }
    const errCode = raw?.error?.code;
    if (errCode && errCode !== "ok") {
      return res.status(502).json({
        ok: false,
        error: "creator_info_rejected",
        tiktok_error_code: raw?.error?.code,
        tiktok_error_message: raw?.error?.message || "",
      });
    }

    const data = raw?.data || {};

    // Normalized shape for the frontend.
    // We keep this defensive because field names can vary slightly over time.
    const normalized = {
      creator_key,
nickname:
  pickString(data.creator_nickname) ||
  pickString(data.nickname) ||
  pickString(data.display_name) ||
  creator.creator_name ||
  creator.tiktok_name ||
  creator.creator_key,

username:
  pickString(data.creator_username) ||
  pickString(data.username) ||
  creator.tiktok_name ||
  null,

avatar_url:
  pickString(data.creator_avatar_url) ||
  pickString(data.avatar_url) ||
  pickString(data.avatar_url_100) ||
  pickString(data.avatar_url_720) ||
  null,
      privacy_level_options:
        pickStringArray(data.privacy_level_options),

      comment_disabled:
        pickBoolean(data.comment_disabled) ??
        false,

      duet_disabled:
        pickBoolean(data.duet_disabled) ??
        false,

      stitch_disabled:
        pickBoolean(data.stitch_disabled) ??
        false,

      max_video_post_duration_sec:
        pickNumber(data.max_video_post_duration_sec),

      // Depending on TikTok response shape, one of these may exist
      can_post:
        pickBoolean(data.can_post) ??
        (pickBoolean(data.can_post_now) ?? true),

      cannot_post_reason:
        pickString(data.cannot_post_reason) ||
        pickString(data.can_not_post_reason) ||
        null,

      // Keep raw data available for future debugging / expansion
      raw_data: data,
    };

    return res.status(200).json({
      ok: true,
      creator: normalized,
    });
  } catch (e: any) {
    console.error(
      "creator-info:error",
      e?.response?.data || e?.message || e
    );

    return res.status(500).json({
      ok: false,
      error: "creator_info_failed",
      details: e?.response?.data || e?.message || String(e),
    });
  }
}