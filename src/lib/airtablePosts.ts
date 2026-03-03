// src/lib/airtablePosts.ts

type AirtableRecord<T> = { id: string; fields: T };

export type PostStatus = "draft" | "publishing" | "published" | "failed";

export type PostFields = {
  creator_slug: string;     // ex: "toulouse"
  video_url: string;        // ex: "https://www.123loger.com/wp-content/uploads/.../file.mp4"
  title: string;            // caption/texte complet (TikTok accepte hashtags dans title)
  status: PostStatus;       // single select côté Airtable
  tiktok_publish_id?: string;
  created_at?: string;      // optionnel
};

const AIRTABLE_API = "https://api.airtable.com/v0";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in env.`);
  return v;
}

function airtableHeaders() {
  return {
    Authorization: `Bearer ${mustEnv("AIRTABLE_API_TOKEN")}`,
    "Content-Type": "application/json",
  };
}

function baseAndTable() {
  return {
    baseId: mustEnv("AIRTABLE_BASE_ID"),
    table: mustEnv("AIRTABLE_POSTS_TABLE"),
  };
}

/**
 * List last draft posts for a city (creator_slug).
 * Uses filterByFormula AND({creator_slug}="toulouse",{status}="draft")
 */
export async function listDraftPosts(creator_slug: string) {
  const { baseId, table } = baseAndTable();

  const filter = encodeURIComponent(
    `AND({creator_slug}="${creator_slug}",{status}="draft")`
  );

  const url =
    `${AIRTABLE_API}/${baseId}/${encodeURIComponent(table)}` +
    `?filterByFormula=${filter}` +
    `&sort[0][field]=created_at&sort[0][direction]=desc` +
    `&maxRecords=20`;

  const res = await fetch(url, { headers: airtableHeaders() });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Airtable listDraftPosts failed: ${res.status} ${txt}`);

  const json = JSON.parse(txt) as { records: AirtableRecord<PostFields>[] };
  return json.records;
}

/**
 * Get one post by Airtable record id.
 */
export async function getPostById(recordId: string) {
  const { baseId, table } = baseAndTable();

  const url = `${AIRTABLE_API}/${baseId}/${encodeURIComponent(table)}/${recordId}`;

  const res = await fetch(url, { headers: airtableHeaders() });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Airtable getPostById failed: ${res.status} ${txt}`);

  const json = JSON.parse(txt) as AirtableRecord<PostFields>;
  return json; // { id, fields }
}

/**
 * Patch fields on a post record.
 */
export async function updatePost(recordId: string, fields: Partial<PostFields>) {
  const { baseId, table } = baseAndTable();

  const url = `${AIRTABLE_API}/${baseId}/${encodeURIComponent(table)}/${recordId}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: airtableHeaders(),
    body: JSON.stringify({ fields }),
  });

  const txt = await res.text();
  if (!res.ok) throw new Error(`Airtable updatePost failed: ${res.status} ${txt}`);

  return JSON.parse(txt);
}