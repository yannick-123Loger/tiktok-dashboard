// src/lib/airtablePosts.ts
type AirtableRecord<T> = { id: string; fields: T };

export type PostFields = {
  creator_key: string;
  video_url: string;
  title: string;
  status: "draft" | "publishing" | "published" | "failed";
  tiktok_publish_id?: string;
  created_at?: string;
};

const AIRTABLE_API = "https://api.airtable.com/v0";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in env.`);
  return v;
}

function headers() {
  return {
    Authorization: `Bearer ${mustEnv("AIRTABLE_API_TOKEN")}`,
    "Content-Type": "application/json",
  };
}

export async function listDraftPosts(creator_key: string) {
  const baseId = mustEnv("AIRTABLE_BASE_ID");
  const table = mustEnv("AIRTABLE_POSTS_TABLE");

  // Airtable formula: AND({creator_key}="toulouse",{status}="draft")
  const filter = encodeURIComponent(
    `AND({creator_key}="${creator_key}",{status}="draft")`
  );

  const url = `${AIRTABLE_API}/${baseId}/${encodeURIComponent(
    table
  )}?filterByFormula=${filter}&sort[0][field]=created_at&sort[0][direction]=desc&maxRecords=20`;

  const res = await fetch(url, { headers: headers() });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Airtable list failed: ${res.status} ${txt}`);
  const json = JSON.parse(txt) as { records: AirtableRecord<PostFields>[] };
  return json.records;
}

export async function updatePost(recordId: string, fields: Partial<PostFields>) {
  const baseId = mustEnv("AIRTABLE_BASE_ID");
  const table = mustEnv("AIRTABLE_POSTS_TABLE");

  const url = `${AIRTABLE_API}/${baseId}/${encodeURIComponent(
    table
  )}/${recordId}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ fields }),
  });

  const txt = await res.text();
  if (!res.ok) throw new Error(`Airtable update failed: ${res.status} ${txt}`);
  return JSON.parse(txt);
}