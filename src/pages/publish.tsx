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
  tiktok_publish_id?: string;
};

type CreatorInfo = {
  creator_key: string;
  nickname: string;
  username?: string | null;
  avatar_url?: string | null;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number | null;
  can_post: boolean;
  cannot_post_reason: string | null;
};

type PrivacyOption =
  | "PUBLIC_TO_EVERYONE"
  | "MUTUAL_FOLLOW_FRIENDS"
  | "FOLLOWER_OF_CREATOR"
  | "SELF_ONLY"
  | "";

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
  const [creatorInfo, setCreatorInfo] = useState<CreatorInfo | null>(null);

  const [loading, setLoading] = useState(false);
  const [creatorInfoLoading, setCreatorInfoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = posts.find((p) => p.id === selectedId) || null;

  // 1) Caption
  const [title, setTitle] = useState("");

  // 2) Privacy
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyOption>("");

  // 3) Interaction settings
  const [allowComments, setAllowComments] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);

  // 4) Branded content
  const [commercial, setCommercial] = useState(false);
  const [brandSelf, setBrandSelf] = useState(false);
  const [brandThirdParty, setBrandThirdParty] = useState(false);

  // 5) Confirmation
  const [consent, setConsent] = useState(false);

  function privacyLabel(value: string) {
    if (value === "PUBLIC_TO_EVERYONE") return "Public";
    if (value === "MUTUAL_FOLLOW_FRIENDS") return "Friends";
    if (value === "FOLLOWER_OF_CREATOR") return "Followers";
    if (value === "SELF_ONLY") return "Only me";
    return value;
  }

  function consentText() {
    if (!commercial || (brandSelf && !brandThirdParty)) {
      return "By posting, you agree to TikTok's Music Usage Confirmation";
    }
    return "By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation";
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/posts/list?creator_key=${encodeURIComponent(creatorKey)}`;
      const r = await fetch(url);

      if (!r.ok) {
        const txt = await r.text();
        console.error("posts:list failed", r.status, txt);
        throw new Error("Unable to load drafts right now. Please try again.");
      }

      const j = await r.json();
      if (!j.ok) throw new Error("Unable to load drafts right now. Please try again.");

      const recs = (j.records || []) as Post[];
      setPosts(recs);

      if (recs.length) {
        if (!selectedId) setSelectedId(recs[0].id);
        else if (!recs.some((p) => p.id === selectedId)) setSelectedId(recs[0].id);
      } else {
        setSelectedId(null);
      }
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCreatorInfo() {
    setCreatorInfoLoading(true);
    try {
      const r = await fetch(
        `/api/tiktok/creator-info?creator_key=${encodeURIComponent(creatorKey)}`
      );
      const j = await r.json();

      if (!r.ok || !j.ok) {
        throw new Error(j.details || j.error || "Unable to load TikTok account info.");
      }

      setCreatorInfo(j.creator);
    } catch (e: any) {
      setError(e?.message || "Unable to load TikTok account info.");
    } finally {
      setCreatorInfoLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadCreatorInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorKey]);

  useEffect(() => {
    if (!selected) return;

    setTitle(selected.title || "");
    setPrivacyLevel("");

    setAllowComments(false);
    setAllowDuet(false);
    setAllowStitch(false);

    setCommercial(false);
    setBrandSelf(false);
    setBrandThirdParty(false);

    setConsent(false);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Privacy -> interaction rules
  useEffect(() => {
    if (privacyLevel === "") {
      setAllowComments(false);
      setAllowDuet(false);
      setAllowStitch(false);
      return;
    }

    setAllowComments(false);
    setAllowDuet(false);
    setAllowStitch(false);

    if (privacyLevel === "SELF_ONLY") {
      return;
    }

    if (
      privacyLevel === "FOLLOWER_OF_CREATOR" ||
      privacyLevel === "MUTUAL_FOLLOW_FRIENDS"
    ) {
      if (!creatorInfo?.comment_disabled) setAllowComments(true);
      return;
    }

    if (privacyLevel === "PUBLIC_TO_EVERYONE") {
      if (!creatorInfo?.comment_disabled) setAllowComments(true);
      if (!creatorInfo?.duet_disabled) setAllowDuet(true);
      if (!creatorInfo?.stitch_disabled) setAllowStitch(true);
    }
  }, [privacyLevel, creatorInfo]);

  // Branded content cannot be private
  useEffect(() => {
    if (commercial && brandThirdParty && privacyLevel === "SELF_ONLY") {
      setPrivacyLevel("");
    }
  }, [commercial, brandThirdParty, privacyLevel]);

  const commentsDisabled =
    privacyLevel === "" ||
    privacyLevel === "SELF_ONLY" ||
    !!creatorInfo?.comment_disabled;

  const duetDisabled =
    privacyLevel === "" ||
    privacyLevel === "SELF_ONLY" ||
    privacyLevel === "FOLLOWER_OF_CREATOR" ||
    privacyLevel === "MUTUAL_FOLLOW_FRIENDS" ||
    !!creatorInfo?.duet_disabled;

  const stitchDisabled =
    privacyLevel === "" ||
    privacyLevel === "SELF_ONLY" ||
    privacyLevel === "FOLLOWER_OF_CREATOR" ||
    privacyLevel === "MUTUAL_FOLLOW_FRIENDS" ||
    !!creatorInfo?.stitch_disabled;

  const privateDisabledForBranded =
    commercial && brandThirdParty;

  const canPublish =
    !!selected &&
    !!creatorInfo?.can_post &&
    privacyLevel !== "" &&
    consent &&
    (!commercial || (brandSelf || brandThirdParty));

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
      if (!r.ok || !j.ok) throw new Error("Unable to publish this video right now.");

      await load();

      alert("Your video has been submitted. It may take a few minutes to appear on TikTok.");
    } catch (e: any) {
      setError(e?.message || "Unable to publish this video right now.");
    } finally {
      setLoading(false);
    }
  }

  const pill = statusLabel(selected?.status);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-[#FE2C55]" />
              TikTok Publisher
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Ready to publish</h1>
            <p className="mt-2 text-zinc-400">
              Review your video, adjust post settings, then publish.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-200">
              <div className="flex items-center gap-3">
                {creatorInfo?.avatar_url ? (
                  <img
                    src={creatorInfo.avatar_url}
                    alt={creatorInfo.nickname}
                    className="h-10 w-10 rounded-full border border-zinc-800"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full border border-zinc-800 bg-zinc-900" />
                )}

                <div>
                  <div className="font-semibold text-white">
                    {creatorInfoLoading ? "Loading account…" : creatorInfo?.nickname || creatorKey}
                  </div>
                  {creatorInfo?.username && (
                    <div className="text-xs text-zinc-400">@{creatorInfo.username}</div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push(`/?creator_key=${encodeURIComponent(creatorKey)}`)}
              className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
            >
              Back
            </button>

            <button
              onClick={() => {
                load();
                loadCreatorInfo();
              }}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              Refresh
            </button>
          </div>
        </div>

        {creatorInfo && !creatorInfo.can_post && (
          <div className="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
            {creatorInfo.cannot_post_reason || "This account cannot publish right now. Please try again later."}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            ❌ {error}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          {/* Queue */}
          <aside className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Queue</div>
              <div className="text-xs text-zinc-400">{posts.length} item(s)</div>
            </div>

            {loading && <div className="mt-4 text-sm text-zinc-400">Loading…</div>}

            {!loading && posts.length === 0 && (
              <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 text-sm text-zinc-400">
                No videos ready for this account.
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
                Select a video on the left to preview.
              </div>
            ) : (
              <>
                {/* Preview */}
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

                <div className="mt-6 grid grid-cols-1 gap-6">
                  {/* 1. Caption */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
                    <div className="text-sm font-semibold">1. Caption</div>
                    <textarea
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      rows={5}
                      className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FE2C55]/40"
                      placeholder="Write a caption…"
                    />
                  </div>

                  {/* 2. Privacy settings */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
                    <div className="text-sm font-semibold">2. Privacy settings</div>

                    <select
                      value={privacyLevel}
                      onChange={(e) => setPrivacyLevel(e.target.value as PrivacyOption)}
                      className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FE2C55]/40"
                    >
                      <option value="">Select…</option>
                      {(creatorInfo?.privacy_level_options || []).map((option) => (
                        <option
                          key={option}
                          value={option}
                          disabled={privateDisabledForBranded && option === "SELF_ONLY"}
                        >
                          {privacyLabel(option)}
                        </option>
                      ))}
                    </select>

                    {privateDisabledForBranded && (
                      <div className="mt-3 text-xs text-zinc-500">
                        Branded content visibility cannot be set to private.
                      </div>
                    )}
                  </div>

                  {/* 3. Interaction settings */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
                    <div className="text-sm font-semibold">3. Interaction settings</div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <label className={`flex items-center gap-2 text-sm ${commentsDisabled ? "text-zinc-500" : "text-zinc-200"}`}>
                        <input
                          type="checkbox"
                          checked={allowComments}
                          disabled={commentsDisabled}
                          onChange={(e) => setAllowComments(e.target.checked)}
                          className="h-4 w-4"
                        />
                        Comments
                      </label>

                      <label className={`flex items-center gap-2 text-sm ${duetDisabled ? "text-zinc-500" : "text-zinc-200"}`}>
                        <input
                          type="checkbox"
                          checked={allowDuet}
                          disabled={duetDisabled}
                          onChange={(e) => setAllowDuet(e.target.checked)}
                          className="h-4 w-4"
                        />
                        Duet
                      </label>

                      <label className={`flex items-center gap-2 text-sm ${stitchDisabled ? "text-zinc-500" : "text-zinc-200"}`}>
                        <input
                          type="checkbox"
                          checked={allowStitch}
                          disabled={stitchDisabled}
                          onChange={(e) => setAllowStitch(e.target.checked)}
                          className="h-4 w-4"
                        />
                        Stitch
                      </label>
                    </div>

                    <div className="mt-3 text-xs text-zinc-500">
                      Available interaction settings depend on the privacy setting selected above.
                    </div>
                  </div>

                  {/* 4. Branded content */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
                    <div className="text-sm font-semibold">4. Branded content</div>

                    <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <label className="flex items-center gap-2 text-sm text-zinc-200">
                        <input
                          type="checkbox"
                          checked={commercial}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setCommercial(checked);

                            if (!checked) {
                              setBrandSelf(false);
                              setBrandThirdParty(false);
                            }
                          }}
                          className="h-4 w-4"
                        />
                        This content promotes yourself, a brand, product or service
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

                          {brandSelf && (
                            <div className="text-xs text-zinc-500">
                              Your photo/video will be labeled as "Promotional content"
                            </div>
                          )}

                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={brandThirdParty}
                              onChange={(e) => setBrandThirdParty(e.target.checked)}
                              className="h-4 w-4"
                            />
                            Branded content
                          </label>

                          {brandThirdParty && (
                            <div className="text-xs text-zinc-500">
                              Your photo/video will be labeled as "Paid partnership"
                            </div>
                          )}

                          {brandSelf && brandThirdParty && (
                            <div className="text-xs text-zinc-500">
                              Your photo/video will be labeled as "Paid partnership"
                            </div>
                          )}

                          {!brandSelf && !brandThirdParty && (
                            <div className="text-xs text-yellow-300">
                              You need to indicate if your content promotes yourself, a third party, or both.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 5. Confirmation */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
                    <div className="text-sm font-semibold">5. Confirmation</div>

                    <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <label className="flex items-start gap-2 text-sm text-zinc-200">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                          className="mt-1 h-4 w-4"
                        />
                        <span>{consentText()}</span>
                      </label>
                    </div>
                  </div>

                  {/* Publish */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
                    <button
                      onClick={publishNow}
                      disabled={!canPublish || loading}
                      className={[
                        "w-full rounded-full px-5 py-3 text-sm font-semibold transition",
                        canPublish && !loading
                          ? "bg-[#FE2C55] text-white hover:bg-[#e02147]"
                          : "bg-zinc-800 text-zinc-400 cursor-not-allowed",
                      ].join(" ")}
                    >
                      {loading ? "Working…" : "Publish"}
                    </button>

                    <div className="mt-3 text-xs text-zinc-500">
                      Publishing can take a few minutes to appear on TikTok.
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