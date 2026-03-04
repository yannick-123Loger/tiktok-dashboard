// src/pages/publish.tsx
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

function statusLabel(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "draft") return { text: "Draft", cls: "bg-zinc-800 text-zinc-200 border-zinc-700" };
  if (s === "publishing") return { text: "Publishing", cls: "bg-yellow-500/15 text-yellow-200 border-yellow-500/30" };
  if (s === "published") return { text: "Published", cls: "bg-green-500/15 text-green-200 border-green-500/30" };
  if (s === "failed") return { text: "Failed", cls: "bg-red-500/15 text-red-200 border-red-500/30" };
  return { text: status || "Unknown", cls: "bg-zinc-800 text-zinc-200 border-zinc-700" };
}

export default function PublishPage() {
  const router = useRouter();

  const creatorKey = useMemo(() => {
    const q = router.query.creator_key;
    return typeof q === "string" && q.length ? q : "toulouse";
  }, [router.query.creator_key]);

const [posts, setPosts] = useState<Post[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const [selectedId, setSelectedId] = useState<string | null>(null);
const selected = posts.find((p) => p.id === selectedId) || null;

// Form state
const [title, setTitle] = useState("");
const [privacyLevel, setPrivacyLevel] = useState<string>("SELF_ONLY"); // locked for audit

const [allowComments, setAllowComments] = useState(false);
const [allowDuet, setAllowDuet] = useState(false);
const [allowStitch, setAllowStitch] = useState(false);

const [commercial, setCommercial] = useState(false);
const [brandSelf, setBrandSelf] = useState(false);
const [brandThirdParty, setBrandThirdParty] = useState(false);

const [consent, setConsent] = useState(false);

const canPublish =
  !!selected &&
  consent &&
  (!commercial || (brandSelf || brandThirdParty));

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/posts/list?creator_key=${encodeURIComponent(creatorKey)}`;
      const r = await fetch(url);

if (!r.ok) {
  // garder la trace côté console (toi), mais message clean côté UI
  const txt = await r.text();
  console.error("posts:list failed", r.status, txt);
  throw new Error("Unable to load drafts right now. Please try again.");
}

      const j = await r.json();
      if (!j.ok) throw new Error(j.details || j.error || "Unable to load drafts.");

      const recs = (j.records || []) as Post[];
      setPosts(recs);

      // Keep selection stable
      if (recs.length) {
        if (!selectedId) setSelectedId(recs[0].id);
        else if (!recs.some((p) => p.id === selectedId)) setSelectedId(recs[0].id);
      } else {
        setSelectedId(null);
      }
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
      setPrivacyLevel("");
      setAllowComments(false);
      setAllowDuet(false);
      setAllowStitch(false);
      setCommercial(false);
      setBrandSelf(false);
      setBrandThirdParty(false);
      setConsent(false);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function publishNow() {
    if (!selected) return;

    setLoading(true);
    setError(null);

    try {
      const r = await fetch("/api/tiktok/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_record_id: selected.id,
          creator_key: creatorKey,
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

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.details || j.error || "Publish failed.");

      await load();
      alert("Publish triggered. It may take a few minutes to appear in TikTok.");
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const pill = statusLabel(selected?.status);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Top bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-[#FE2C55]" />
              Creator Dashboard
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Drafts</h1>
            <p className="mt-2 text-zinc-400">
              Preview your video, choose options, then publish.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-200">
              City: <span className="font-semibold">{creatorKey}</span>
            </div>
            <button
              onClick={() => router.push(`/?creator_key=${encodeURIComponent(creatorKey)}`)}
              className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
            >
              Back
            </button>
            <button
              onClick={load}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            ❌ {error}
          </div>
        )}

        {/* Layout */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          {/* Sidebar drafts */}
          <aside className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Draft list</div>
              <div className="text-xs text-zinc-400">{posts.length} item(s)</div>
            </div>

            {loading && (
              <div className="mt-4 text-sm text-zinc-400">Loading…</div>
            )}

            {!loading && posts.length === 0 && (
              <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 text-sm text-zinc-400">
                No drafts for this city yet.
              </div>
            )}

            <div className="mt-4 space-y-2">
              {posts.map((p) => {
                const active = p.id === selectedId;
                const sp = statusLabel(p.status);
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={[
                      "w-full rounded-xl border px-3 py-3 text-left transition",
                      active
                        ? "border-zinc-700 bg-zinc-900"
                        : "border-zinc-900 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/40",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">
                          {(p.title || "(untitled)").slice(0, 80)}
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          {p.created_at ? `Created: ${p.created_at}` : "—"}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] ${sp.cls}`}>
                        {sp.text}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main panel */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            {!selected ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-6 text-zinc-400">
                Select a draft on the left to preview.
              </div>
            ) : (
              <>
                {/* Preview header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">Preview</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {selected.created_at ? `Created: ${selected.created_at}` : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs ${pill.cls}`}>
                      {pill.text}
                    </span>
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                  <video src={selected.video_url} controls className="w-full" />
                </div>

                {/* Form */}
                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Left: Title + toggles */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
                    <div className="text-sm font-semibold">Caption</div>
                    <textarea
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      rows={6}
                      className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FE2C55]/40"
                      placeholder="Write a caption…"
                    />

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <label className="flex items-center gap-2 text-sm text-zinc-200">
                        <input
                          type="checkbox"
                          checked={allowComments}
                          onChange={(e) => setAllowComments(e.target.checked)}
                          className="h-4 w-4"
                        />
                        Comments
                      </label>
                      <label className="flex items-center gap-2 text-sm text-zinc-200">
                        <input
                          type="checkbox"
                          checked={allowDuet}
                          onChange={(e) => setAllowDuet(e.target.checked)}
                          className="h-4 w-4"
                        />
                        Duet
                      </label>
                      <label className="flex items-center gap-2 text-sm text-zinc-200">
                        <input
                          type="checkbox"
                          checked={allowStitch}
                          onChange={(e) => setAllowStitch(e.target.checked)}
                          className="h-4 w-4"
                        />
                        Stitch
                      </label>
                    </div>
                  </div>

                  {/* Right: Privacy + compliance */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
                    <div className="text-sm font-semibold">Post settings</div>

                      <label className="mt-3 block text-sm text-zinc-200">Privacy</label>

                      <select
                            value="SELF_ONLY"
                            disabled
                            className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white opacity-80"
                            >
                           <option value="SELF_ONLY">Only me</option>
                          </select>

                        <div className="mt-2 text-xs text-zinc-500">
                          During review, publishing is limited to private visibility.
                          </div>
                    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <label className="flex items-center gap-2 text-sm text-zinc-200">
                        <input
                          type="checkbox"
                          checked={commercial}
                          onChange={(e) => setCommercial(e.target.checked)}
                          className="h-4 w-4"
                        />
                        This post is commercial content
                      </label>

                      {commercial && (
                        <div className="mt-3 space-y-2 pl-1 text-sm text-zinc-200">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={brandSelf}
                              onChange={(e) => setBrandSelf(e.target.checked)}
                              className="h-4 w-4"
                            />
                            Your brand
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={brandThirdParty}
                              onChange={(e) => setBrandThirdParty(e.target.checked)}
                              className="h-4 w-4"
                            />
                            Third-party brand
                          </label>
                          <div className="text-xs text-zinc-400">
                            If commercial content is enabled, select at least one option.
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <label className="flex items-start gap-2 text-sm text-zinc-200">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                          className="mt-1 h-4 w-4"
                        />
                        <span>
                          I confirm I have the rights to use the audio/music in this video and agree to platform policies.
                        </span>
                      </label>
                    </div>

                    <button
                      onClick={publishNow}
                      disabled={!canPublish || loading}
                      className={[
                        "mt-4 w-full rounded-full px-5 py-3 text-sm font-semibold transition",
                        canPublish && !loading
                          ? "bg-[#FE2C55] text-white hover:bg-[#e02147]"
                          : "bg-zinc-800 text-zinc-400 cursor-not-allowed",
                      ].join(" ")}
                    >
                      {loading ? "Working…" : "Publish"}
                    </button>

                    <div className="mt-3 text-xs text-zinc-500">
                      Publishing can take a few minutes to appear in TikTok.
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}