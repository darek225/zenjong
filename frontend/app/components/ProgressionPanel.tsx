"use client";

import { useState } from "react";
import { isJourneyStageUnlocked, JOURNEY_STAGES, type LocalProfile } from "../../lib/progression";
import { LAYOUT_OPTIONS } from "../../lib/gameModes";

interface ProgressionPanelProps {
  profile: LocalProfile;
  onClose: () => void;
  onStartJourney: (layout: string, stageId: string) => void;
}

const achievements = [
  ["first_clear", "First Light", "Clear your first table."],
  ["five_clears", "Steady Hands", "Clear five tables."],
  ["score_10000", "Master’s Eye", "Score 10,000 points in one hand."],
  ["daily_challenge", "Daily Ritual", "Complete a Daily Challenge."],
  ["no_hint", "Unassisted", "Clear a table without a hint."],
  ["no_shuffle", "Unbroken Pattern", "Clear a table without shuffling."],
];

export default function ProgressionPanel({ profile, onClose, onStartJourney }: ProgressionPanelProps) {
  const [tab, setTab] = useState<"journey" | "achievements">("journey");
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="progression-title" className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-amber-100/20 bg-[#101c18] p-6 text-white shadow-2xl">
      <header className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[.35em] text-amber-200/60">Progression</p><h2 id="progression-title" className="mt-2 font-serif text-4xl text-amber-50">Your path</h2></div><button className="rounded-lg border border-white/15 px-3 py-2 text-white/70 hover:bg-white/10" onClick={onClose} aria-label="Close progression">✕</button></header>
      <nav className="mt-6 flex gap-2"><button className={`rounded-lg px-4 py-2 text-sm ${tab === "journey" ? "bg-amber-200 font-bold text-[#17251d]" : "border border-white/15"}`} onClick={() => setTab("journey")}>Journey</button><button className={`rounded-lg px-4 py-2 text-sm ${tab === "achievements" ? "bg-amber-200 font-bold text-[#17251d]" : "border border-white/15"}`} onClick={() => setTab("achievements")}>Achievements <span className="ml-1 opacity-70">{profile.achievements.length}/{achievements.length}</span></button></nav>
      {tab === "journey" ? <div className="mt-6 grid gap-3 sm:grid-cols-2">{JOURNEY_STAGES.map((stage, index) => { const record = profile.journey[stage.id]; const isUnlocked = isJourneyStageUnlocked(profile, stage.id); const layout = LAYOUT_OPTIONS.find(option => option.id === stage.layout); return <article key={stage.id} className={`rounded-2xl border p-4 ${record ? "border-emerald-300/40 bg-emerald-300/5" : isUnlocked ? "border-amber-200/30 bg-white/[.04]" : "border-white/10 opacity-50"}`}><div className="flex items-start justify-between"><div><span className="text-xs uppercase tracking-widest text-white/40">Stage {index + 1}</span><h3 className="mt-1 text-lg font-semibold text-amber-50">{stage.name}</h3></div><span className="text-xs text-emerald-300">{record ? `${record.stars}/3 stars` : `${stage.reward} Jade`}</span></div><p className="mt-2 text-sm text-white/50">{layout?.description} Score target: {stage.target.toLocaleString()}.</p>{record && <p className="mt-2 text-xs text-white/60">Best score: {record.bestScore.toLocaleString()}</p>}<button className="mt-4 w-full rounded-lg border border-amber-200/30 px-3 py-2 text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40" disabled={!isUnlocked} onClick={() => onStartJourney(stage.layout, stage.id)}>{record ? "Replay stage" : isUnlocked ? "Play stage" : "Locked"}</button></article>; })}</div> : <div className="mt-6 grid gap-3 sm:grid-cols-2">{achievements.map(([id, name, description]) => { const earned = profile.achievements.includes(id); return <article key={id} className={`rounded-2xl border p-4 ${earned ? "border-amber-200/40 bg-amber-200/5" : "border-white/10 opacity-70"}`}><div className="flex items-center gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-full ${earned ? "bg-amber-200 text-[#17251d]" : "bg-white/10 text-white/40"}`}>{earned ? "✓" : "·"}</span><div><h3 className="font-semibold text-amber-50">{name}</h3><p className="text-xs text-white/50">{description}</p></div></div></article>; })}</div>}
    </section>
  </div>;
}