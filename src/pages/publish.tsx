import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

type Post = {
  id: string;
  creator_key: string;
  video_url: string;
  title: string;
  status: string;
  created_at?: string;
};

export default function PublishPage() {
  const router = useRouter();
  const creatorKey = useMemo(() => {
    const q = router.query.creator_key;
    return typeof q === "string" && q.length ? q : "toulouse";
  }, [router.query.creator_key]);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state for the selected post
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = posts.find((p) => p.id === selectedId) || null;

  const [title, setTitle] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState<string>(""); // must be user-selected, no default
  const [allowComments, setAllowComments] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);
  const [commercial, setCommercial] = useState(false);
  const [brandSelf, setBrandSelf] = useState(false);
  const [brandThirdParty, setBrandThirdParty] = useState(false);
  const [consent, setConsent] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/posts/list?creator_key=${encodeURIComponent(creatorKey)}`);
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "list_failed");
      setPosts(j.records);
      if (j.records?.length && !selectedId) setSelectedId(j.records[0].id);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorKey]);

  useEffect(() => {
    if (selected) {
      setTitle(selected.title || "");
      setPrivacyLevel(""); // force user selection each time
      setAllowComments(false);
      setAllowDuet(false);
      setAllowStitch(false);
      setCommercial(false);
      setBrandSelf(false);
      setBrandThirdParty(false);
      setConsent(false);
    }
  }, [selectedId]);

  const canPublish =
    !!selected &&
    privacyLevel !== "" &&
    consent &&
    (!commercial || (commercial && (brandSelf || brandThirdParty))); // if commercial turned on, require at least one checkbox

async function publishNow() {
  if (!selected) return;

  setLoading(true);
  setError(null);

  try {
    const r = await fetch("/api/tiktok/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        post_record_id: selected.id,     // ✅ record Airtable (= id dans ta liste)
        creator_slug: creatorKey,        // ✅ la ville (toulouse)
        // bonus: on envoie aussi les métadonnées choisies
        title,
        privacy_level: privacyLevel,
        allow_comments: allowComments,
        allow_duet: allowDuet,
        allow_stitch: allowStitch,
        commercial,
        brand_self: brandSelf,
        brand_third_party: brandThirdParty,
      }),
    });

    const j = await r.json();
    if (!r.ok || !j.ok) throw new Error(j.details || j.error || "publish_failed");

    await load();
    alert("Publish triggered. It may take a few minutes to appear on TikTok.");
  } catch (e: any) {
    setError(e?.message || String(e));
  } finally {
    setLoading(false);
  }
}

  return (
    <main style={{ maxWidth: 920, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Creator Dashboard (Audit MVP)</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Review a draft video, choose metadata, then publish to TikTok.
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <input
          value={creatorKey}
          readOnly
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", width: 220 }}
        />
        <button onClick={load} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #000" }}>
          Refresh drafts
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: 10, border: "1px solid #c00", borderRadius: 8 }}>
          ❌ {error}
        </div>
      )}

      {loading && <div style={{ marginTop: 12, opacity: 0.7 }}>Loading…</div>}

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, marginTop: 16 }}>
        <aside style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Drafts</div>
          {posts.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No draft posts for this city.</div>
          ) : (
            posts.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: 10,
                  borderRadius: 12,
                  border: p.id === selectedId ? "1px solid #000" : "1px solid #eee",
                  background: "white",
                  marginBottom: 8,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>{(p.title || "").slice(0, 60) || "(untitled)"}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>status: {p.status}</div>
              </button>
            ))
          )}
        </aside>

        <section style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
          {!selected ? (
            <div style={{ opacity: 0.7 }}>Select a draft to review.</div>
          ) : (
            <>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Preview</div>
              <video
                src={selected.video_url}
                controls
                style={{ width: "100%", borderRadius: 12, border: "1px solid #eee" }}
              />

              <div style={{ marginTop: 14, fontWeight: 700 }}>Post metadata</div>

              <label style={{ display: "block", marginTop: 10, fontSize: 13, fontWeight: 600 }}>Title</label>
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                rows={4}
                style={{ width: "100%", borderRadius: 12, border: "1px solid #ddd", padding: 10 }}
              />

              <label style={{ display: "block", marginTop: 10, fontSize: 13, fontWeight: 600 }}>
                Privacy level (no default)
              </label>
              <select
                value={privacyLevel}
                onChange={(e) => setPrivacyLevel(e.target.value)}
                style={{ width: "100%", borderRadius: 12, border: "1px solid #ddd", padding: 10 }}
              >
                <option value="">Select…</option>
                <option value="PUBLIC_TO_EVERYONE">Public</option>
                <option value="MUTUAL_FOLLOW_FRIENDS">Friends</option>
                <option value="FOLLOWER_OF_CREATOR">Followers</option>
                <option value="SELF_ONLY">Only me</option>
              </select>

              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} />
                  Allow comments
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={allowDuet} onChange={(e) => setAllowDuet(e.target.checked)} />
                  Allow duet
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={allowStitch} onChange={(e) => setAllowStitch(e.target.checked)} />
                  Allow stitch
                </label>
              </div>

              <div style={{ marginTop: 14, fontWeight: 700 }}>Commercial content</div>
              <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                <input type="checkbox" checked={commercial} onChange={(e) => setCommercial(e.target.checked)} />
                This post promotes a brand/product/service
              </label>

              {commercial && (
                <div style={{ marginTop: 8, padding: 10, border: "1px solid #eee", borderRadius: 12 }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={brandSelf} onChange={(e) => setBrandSelf(e.target.checked)} />
                    Your brand
                  </label>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                    <input
                      type="checkbox"
                      checked={brandThirdParty}
                      onChange={(e) => setBrandThirdParty(e.target.checked)}
                    />
                    Branded content (third party)
                  </label>
                  <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                    Note: If commercial content is enabled, select at least one option above to publish.
                  </div>
                </div>
              )}

              <div style={{ marginTop: 14, padding: 10, border: "1px solid #eee", borderRadius: 12 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span style={{ fontSize: 13 }}>
                    By posting, you agree to TikTok&apos;s Music Usage Confirmation. (And if branded content applies,
                    you also agree to the Branded Content Policy.)
                  </span>
                </label>
              </div>

              <button
                onClick={publishNow}
                disabled={!canPublish}
                style={{
                  marginTop: 14,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #000",
                  background: canPublish ? "white" : "#f3f3f3",
                  cursor: canPublish ? "pointer" : "not-allowed",
                  fontWeight: 700,
                }}
              >
                Publish to TikTok
              </button>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                After publishing, it may take a few minutes for the post to be processed and visible on the TikTok
                profile.
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}