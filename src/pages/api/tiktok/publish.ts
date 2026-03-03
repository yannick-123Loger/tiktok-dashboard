// src/pages/api/tiktok/publish.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { updatePost, getPostById } from "@/lib/airtablePosts";
import { getCreatorByKey } from "@/lib/airtable";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "method_not_allowed" });
    }

    const { post_record_id, creator_key } = req.body || {};
    if (!post_record_id) return res.status(400).json({ ok: false, error: "missing_post_record_id" });
    if (!creator_key) return res.status(400).json({ ok: false, error: "missing_creator_key" });

    const creator = await getCreatorByKey(String(creator_key));
    if (!creator?.access_token) {
      return res.status(400).json({ ok: false, error: "missing_creator_access_token" });
    }

const post = await getPostById(String(post_record_id));
if (!post?.fields?.video_url) {
  return res.status(400).json({ ok: false, error: "missing_video_url" });
}

const videoUrl = post.fields.video_url;
const title = post.fields.title || "Draft from dashboard";
    const ACCESS_TOKEN = creator.access_token;

    console.log("publish:start", { post_record_id, creator_key, videoUrl });

    // UX: status visible
    await updatePost(post_record_id, { status: "publishing" });

    // INIT via PULL_FROM_URL (aligné avec ton cas serveur)
    const payload = {
      post_info: {
        title,
        privacy_level: "SELF_ONLY",
        disable_duet: true,
        disable_stitch: true,
        comment_disabled: false,
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

    const initJson = JSON.parse(initTxt);

    // TODO: ici tu dois récupérer publish_id / upload_url / etc selon la réponse
    // et les enregistrer dans Airtable (tiktok_publish_id + status "uploading")
    // puis lancer la suite (pull ou upload completion)

    return res.status(200).json({ ok: true, init: initJson });
  } catch (e: any) {
    console.error("publish:error", e?.message || e);
    return res.status(500).json({ ok: false, error: "publish_failed", details: e?.message || String(e) });
  }
}