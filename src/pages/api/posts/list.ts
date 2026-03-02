// src/pages/api/posts/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { listDraftPosts } from "@/lib/airtablePosts";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const creator_key = String(req.query.creator_key || "");
    if (!creator_key) return res.status(400).json({ error: "missing_creator_key" });

    const records = await listDraftPosts(creator_key);

    return res.status(200).json({
      ok: true,
      records: records.map((r) => ({ id: r.id, ...r.fields })),
    });
  } catch (e: any) {
    return res.status(500).json({ error: "list_failed", details: e?.message || String(e) });
  }
}