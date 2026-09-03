"use client";

interface ViewToggleProps {
  isDualCamera: boolean;
  onToggle: () => void;
}

export default function ViewToggle({ isDualCamera, onToggle }: ViewToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border-2 ${
        isDualCamera
          ? "border-yellow-500 bg-yellow-900/30 ring-2 ring-yellow-500"
          : "border-gray-600 bg-gray-800/50"
      } hover:border-yellow-400`}
    >
      <span className={isDualCamera ? "text-xl text-yellow-400" : "text-gray-300"}>
        {isDualCamera ? "📐" : "🎥"}
      </span>
    </button>
  );
}