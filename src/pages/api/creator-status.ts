import type { NextApiRequest, NextApiResponse } from "next";
import { getCreatorByKey } from "@/lib/airtable";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const creator_key = req.query.creator_key;

  if (typeof creator_key !== "string") {
    return res.status(400).json({ error: "missing_creator_key" });
  }

  const creator = await getCreatorByKey(creator_key);

  return res.status(200).json({
    is_connected: !!creator?.is_connected,
  });
}