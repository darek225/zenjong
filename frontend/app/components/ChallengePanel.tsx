"use client";

import { useMemo, useState } from "react";
import { dailySeed } from "../../lib/gameModes";
import { dateKey } from "../../lib/challenges";
import type { LocalProfile } from "../../lib/progression";

interface ChallengePanelProps { profile: LocalProfile; onDaily: () => void; onImport: (code: string) => void; }
export default function ChallengePanel({ profile, onDaily, onImport }: ChallengePanelProps) {
  const [code, setCode] = useState("");
  const today = dateKey();
  const record = profile.dailyRecords[today];
  const seed = useMemo(() => dailySeed(), []);
  return <section className="mb-6 max-w-md rounded-2xl border border-amber-200/20 bg-white/[.05] p-4">
    <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-widest text-amber-200/60">Today&apos;s table</p><h2 className="mt-1 text-lg font-semibold text-amber-50">Daily Challenge</h2></div><span className="text-xs text-emerald-300">250 Jade</span></div>
    <p className="mt-2 text-sm text-white/55">Butterfly layout · 15 minutes · no assistance · verified seed {seed}</p>
    <p className="mt-2 text-xs text-white/40">{record ? `Best: ${record.score.toLocaleString()} points · ${record.time}s` : "Not completed today"} · streak {profile.dailyStreak}</p>
    <button className="mt-3 rounded-lg bg-amber-200 px-4 py-2 text-sm font-bold text-[#17251d]" onClick={onDaily}>{record ? "Replay today" : "Play today"}</button>
    <div className="mt-4 border-t border-white/10 pt-3"><label className="text-xs uppercase tracking-widest text-white/40">Import challenge code<input className="mt-2 w-full rounded-lg bg-slate-900 p-2 text-sm text-white" value={code} onChange={event => setCode(event.target.value)} placeholder="ZJ1-DAILY-BUTTERFLY-..." /></label><button className="mt-2 rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-40" disabled={!code.trim()} onClick={() => onImport(code)}>Open unranked challenge</button><p className="mt-2 text-[11px] text-white/35">Imported challenges reproduce the deal but cannot claim Daily rewards.</p></div>
  </section>;
}