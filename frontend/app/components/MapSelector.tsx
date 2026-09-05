"use client";

import { ENVIRONMENTS } from "../../lib/environments";

interface MapSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMapId: string;
  onSelectMap: (mapId: string) => void;
}

export default function MapSelector({
  isOpen,
  onClose,
  selectedMapId,
  onSelectMap,
}: MapSelectorProps) {
  if (!isOpen) return null;

  const handleSelect = (mapId: string) => {
    onSelectMap(mapId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm fade-in">
      <div className="glass-panel rounded-2xl shadow-2xl w-full max-w-3xl p-8 scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="arcade-title text-3xl">SELECT ENVIRONMENT</h2>
          <button onClick={onClose} className="text-yellow-300/70 hover:text-yellow-300 text-3xl leading-none font-bold">
            &times;
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {ENVIRONMENTS.map((env) => {
            const selected = selectedMapId === env.id;
            const icon = env.id === "temple_courtyard" ? "🏛️" : env.id === "nature_stump" ? "🌿" : env.id === "mystic_sanctuary" ? "✨" : "💡";
            return (
              <button
                key={env.id}
                onClick={() => handleSelect(env.id)}
                className={`relative rounded-xl border-2 p-4 text-left transition-all duration-200 overflow-hidden
                  ${selected
                    ? "border-yellow-400 bg-gradient-to-br from-yellow-900/40 to-amber-700/30 shadow-[0_0_24px_rgba(255,215,0,0.35)] scale-[1.02]"
                    : "border-yellow-700/40 bg-slate-900/60 hover:border-yellow-500/70 hover:bg-slate-800/70"
                  }`}
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-600 via-yellow-300 to-yellow-600"></div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-white text-base tracking-wide">
                    {icon} {env.name}
                  </div>
                  {selected && <span className="text-yellow-300 text-xs font-bold">SELECTED</span>}
                </div>
                <div className="text-xs text-white/70 leading-relaxed mb-2">{env.description}</div>
                <div className="text-[0.65rem] uppercase tracking-widest text-yellow-500/80">
                  Table: {env.tableType} {env.hasFlames ? "• Flames" : ""} {env.hasSpotlights ? "• Spotlights" : ""}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="arcade-btn arcade-btn-sm">
            CONFIRM &amp; CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}