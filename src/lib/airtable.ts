// src/lib/airtable.ts
type AirtableRecord<T> = {
  id: string;
  fields: T;
};

type CreatorFields = {
  creator_key: string;
  open_id?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  refresh_expires_at?: string;
  scope?: string;
  token_type?: string;
  is_connected?: boolean;
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

export async function getCreatorByKey(creator_key: string) {
  const baseId = mustEnv("AIRTABLE_BASE_ID");
  const table = mustEnv("AIRTABLE_CREATORS_TABLE");

  const filter = encodeURIComponent(`{creator_key}="${creator_key}"`);
  const url = `${AIRTABLE_API}/${baseId}/${encodeURIComponent(
    table
  )}?filterByFormula=${filter}&maxRecords=1`;

  const res = await fetch(url, { headers: airtableHeaders() });
  const json = await res.json();

  return json.records?.[0] ?? null;
}

export async function upsertCreatorByKey(fields: CreatorFields) {
  const baseId = mustEnv("AIRTABLE_BASE_ID");
  const table = mustEnv("AIRTABLE_CREATORS_TABLE");

  // 1) Find record by creator_key
  const filter = encodeURIComponent(`{creator_key}="${fields.creator_key}"`);
  const findUrl = `${AIRTABLE_API}/${baseId}/${encodeURIComponent(
    table
  )}?filterByFormula=${filter}&maxRecords=1`;

  const findRes = await fetch(findUrl, { headers: airtableHeaders() });
  const findJson = (await findRes.json()) as { records: AirtableRecord<CreatorFields>[] };

  if (findJson.records?.length) {
    const recordId = findJson.records[0].id;

    // 2) PATCH existing
    const patchUrl = `${AIRTABLE_API}/${baseId}/${encodeURIComponent(
      table
    )}/${recordId}`;

    const patchRes = await fetch(patchUrl, {
      method: "PATCH",
      headers: airtableHeaders(),
      body: JSON.stringify({ fields }),
    });

    if (!patchRes.ok) {
      const txt = await patchRes.text();
      throw new Error(`Airtable PATCH failed: ${patchRes.status} ${txt}`);
    }
    return await patchRes.json();
  }

  // 3) POST new
  const postUrl = `${AIRTABLE_API}/${baseId}/${encodeURIComponent(table)}`;

  const postRes = await fetch(postUrl, {
    method: "POST",
    headers: airtableHeaders(),
    body: JSON.stringify({ fields }),
  });

  if (!postRes.ok) {
    const txt = await postRes.text();
    throw new Error(`Airtable POST failed: ${postRes.status} ${txt}`);
  }
  return await postRes.json();
}
// src/lib/airtable.ts

export async function getCreatorBySlug(creator_slug: string) {
  const baseId = mustEnv("AIRTABLE_BASE_ID");
  const table = mustEnv("AIRTABLE_CREATORS_TABLE");

  // Find record by creator_slug
  const filter = encodeURIComponent(`{creator_slug}="${creator_slug}"`);
  const url = `${AIRTABLE_API}/${baseId}/${encodeURIComponent(
    table
  )}?filterByFormula=${filter}&maxRecords=1`;

  const res = await fetch(url, { headers: airtableHeaders() });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Airtable getCreatorBySlug failed: ${res.status} ${txt}`);
  }

  const json = (await res.json()) as { records: AirtableRecord<CreatorFields>[] };
  const record = json.records?.[0];
  if (!record) return null;

  return { id: record.id, ...record.fields };
}