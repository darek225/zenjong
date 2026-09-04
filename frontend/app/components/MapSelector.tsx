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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Select Environment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">
            &times;
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {ENVIRONMENTS.map((env) => (
            <button
              key={env.id}
              onClick={() => handleSelect(env.id)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${selectedMapId === env.id
                  ? "border-yellow-500 bg-yellow-900/30 ring-2 ring-yellow-500"
                  : "border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-700/50"
                }`}
            >
              <div className="font-semibold text-white text-sm mb-1">{env.name}</div>
              <div className="text-xs text-gray-300 line-clamp-2">{env.description}</div>
              <div className="text-xs text-gray-400 mt-2 capitalize">Table: {env.tableType}</div>
            </button>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}