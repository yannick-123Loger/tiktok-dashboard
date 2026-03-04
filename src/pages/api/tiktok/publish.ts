// src/pages/api/tiktok/publish.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { updatePost, getPostById } from "@/lib/airtablePosts";
import { getCreatorByKey } from "@/lib/airtable";

function pickString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length ? v.trim() : null;
}

function pickBool(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

// (Optionnel) petit mapping “UI -> TikTok”
function normalizePrivacyLevel(v: string | null): string {
  const p = (v || "").toUpperCase();
  // valeurs TikTok attendues: PUBLIC_TO_EVERYONE | MUTUAL_FOLLOW_FRIENDS | FOLLOWER_OF_CREATOR | SELF_ONLY
  if (
    p === "PUBLIC_TO_EVERYONE" ||
    p === "MUTUAL_FOLLOW_FRIENDS" ||
    p === "FOLLOWER_OF_CREATOR" ||
    p === "SELF_ONLY"
  ) {
    return p;
  }
  return "SELF_ONLY"; // safe default pour audit
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "method_not_allowed" });
    }

    const body = req.body || {};
    const post_record_id = pickString(body.post_record_id);
    const creator_key = pickString(body.creator_key);

    if (!post_record_id) return res.status(400).json({ ok: false, error: "missing_post_record_id" });
    if (!creator_key) return res.status(400).json({ ok: false, error: "missing_creator_key" });

    // 1) Load creator tokens
    const creator = await getCreatorByKey(String(creator_key));
    if (!creator?.access_token) {
      return res.status(400).json({ ok: false, error: "missing_creator_access_token" });
    }
    const ACCESS_TOKEN = creator.access_token;

    // 2) Load post from Airtable (source of truth for video_url)
    const post = await getPostById(String(post_record_id));
    const videoUrl = post?.fields?.video_url;
    if (!videoUrl) {
      return res.status(400).json({ ok: false, error: "missing_video_url" });
    }

    // 3) Use UI edits if provided (caption + privacy + toggles)
    const titleFromUI = pickString(body.title);
    const storedTitle = pickString(post?.fields?.title) || "";
    const finalTitle = titleFromUI || storedTitle || "Draft from dashboard";

    const privacy_level = normalizePrivacyLevel(pickString(body.privacy_level));

    const allow_comments = pickBool(body.allow_comments);
    const allow_duet = pickBool(body.allow_duet);
    const allow_stitch = pickBool(body.allow_stitch);

    // TikTok API utilise des flags inversés (disable_* / comment_disabled)
    const comment_disabled = !allow_comments;
    const disable_duet = !allow_duet;
    const disable_stitch = !allow_stitch;

    // Logs safe (sans token)
    console.log("publish:start", {
      post_record_id,
      creator_key,
      videoUrl,
      privacy_level,
      caption_len: finalTitle.length,
    });

    // 4) Persist UI caption + set publishing status (un seul PATCH = moins de risques)
    await updatePost(post_record_id, {
      title: finalTitle,
      status: "publishing",
    });

    // 5) INIT via PULL_FROM_URL
    const payload = {
      post_info: {
        title: finalTitle,
        privacy_level,
        disable_duet,
        disable_stitch,
        comment_disabled,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: videoUrl,
      },
    };

    const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const initTxt = await initRes.text();
    console.log("publish:init_http_status", initRes.status);
    console.log("publish:init_body_head", initTxt.slice(0, 800));

    if (!initRes.ok) {
      await updatePost(post_record_id, { status: "failed" });
      return res.status(502).json({
        ok: false,
        error: "tiktok_init_failed",
        status: initRes.status,
        body: initTxt,
      });
    }

    let initJson: any = null;
    try {
      initJson = JSON.parse(initTxt);
    } catch {
      await updatePost(post_record_id, { status: "failed" });
      return res.status(502).json({
        ok: false,
        error: "tiktok_init_invalid_json",
        body: initTxt,
      });
    }

    const publishId = initJson?.data?.publish_id || initJson?.data?.publishId || null;

    if (!publishId) {
      await updatePost(post_record_id, { status: "failed" });
      return res.status(502).json({
        ok: false,
        error: "tiktok_init_missing_publish_id",
        body: initJson,
      });
    }

    // 6) Persist publish_id (garde status publishing)
    await updatePost(post_record_id, {
      tiktok_publish_id: String(publishId),
      status: "publishing",
    });

    return res.status(200).json({
      ok: true,
      publish_id: String(publishId),
    });
  } catch (e: any) {
    console.error("publish:error", e?.message || e);
    return res.status(500).json({
      ok: false,
      error: "publish_failed",
      details: e?.message || String(e),
    });
  }
}