import type { NextApiRequest, NextApiResponse } from "next";
import { updatePost } from "@/lib/airtablePosts";
import { getCreatorByKey } from "@/lib/airtable";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "method_not_allowed" });
    }

    const { post_record_id, creator_key, video_size } = req.body || {};
    if (!post_record_id) {
      return res.status(400).json({ ok: false, error: "missing_post_record_id" });
    }
    if (!creator_key) {
      return res.status(400).json({ ok: false, error: "missing_creator_slug" });
    }

    const creator = await getCreatorByKey(creator_key);

if (!creator?.access_token) {
  return res.status(400).json({ ok: false, error: "missing_creator_access_token" });
}

const ACCESS_TOKEN = creator.access_token;

    console.log("publish:start", { post_record_id, creator_key });

    // 1) UX: mark as publishing immediately
    await updatePost(post_record_id, { status: "publishing" });

    // 2) Call TikTok INIT (payload minimal mais réel)
    console.log("publish:calling_tiktok_init");

    const payload = {
      post_info: {
        title: "Test publish from dashboard",
        privacy_level: "SELF_ONLY",
        disable_duet: true,
        disable_stitch: true,
        comment_disabled: false,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: Number(video_size || 0),
        chunk_size: Number(video_size || 0),
        total_chunk_count: 1,
      },
    };

    if (!payload.source_info.video_size || payload.source_info.video_size <= 0) {
      // rollback status
      await updatePost(post_record_id, { status: "draft" });
      return res.status(400).json({ ok: false, error: "missing_or_invalid_video_size" });
    }

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
    console.log("publish:init_status", initRes.status);
    console.log("publish:init_body", initTxt.slice(0, 800));

    if (!initRes.ok) {
      await updatePost(post_record_id, { status: "failed" });
      return res.status(502).json({ ok: false, error: "tiktok_init_failed", status: initRes.status, body: initTxt });
    }

    const initJson = JSON.parse(initTxt);
    console.log("publish:init_parsed_keys", Object.keys(initJson?.data || {}));

    // Pour l’instant on n’upload pas encore => on retourne la réponse INIT
    return res.status(200).json({ ok: true, init: initJson });
  } catch (e: any) {
    console.error("publish:error", e?.message || e);
    return res.status(500).json({ ok: false, error: "publish_failed", details: e?.message || String(e) });
  }
}