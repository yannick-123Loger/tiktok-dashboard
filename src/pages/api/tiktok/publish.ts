import type { NextApiRequest, NextApiResponse } from "next";
import { updatePost } from "@/lib/airtablePosts";

// TODO: implement TikTok init + upload status + publish using PULL_FROM_URL
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });

    const { post_record_id } = req.body || {};
    if (!post_record_id) return res.status(400).json({ ok: false, error: "missing_post_record_id" });

    // mark as publishing (audit UX expects status visibility)
    await updatePost(post_record_id, { status: "publishing" });

    // For now, we just acknowledge. Next step: real TikTok calls.
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "publish_failed", details: e?.message || String(e) });
  }
}