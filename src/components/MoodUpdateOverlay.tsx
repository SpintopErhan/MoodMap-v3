// src/components/MoodUpdateOverlay.tsx
"use client";

import React, { useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils"; // cn yardımcı fonksiyonunu import ettik.

const moodsEmojis = [
  "🤩","😍","🥰","😘","😊","🙂","🤗","🤔","😐","😑","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","🥱",
  "😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢",
  "😭","😦","😧","😨","😩","🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","🥴","😠","😡","🤬","😷","🤒",
  "🤕","🤢","🤮","🤧","😇","🥺","🤠","🥳","😎","🤓","🧐","😋","😚","😙","🥲","😈","👿","💀","☠️","👻",
  "👽","🤖","💩","😺","😸","😹","😻","😼","😽","🙀","😿","😾","🙈","🙉","🙊","❤️","💔","💕","💞","💓","💗","💖"
];

interface MoodUpdateOverlayProps {
  onClose: () => void;
  onSubmit: (emoji: string, status: string) => Promise<void>; 
  locationError: boolean;
  loading: boolean;
  className?: string; // Dışarıdan class'lar almak için
}

const MoodUpdateOverlay: React.FC<MoodUpdateOverlayProps> = ({
  onClose,
  onSubmit,
  locationError,
  loading,
  className, 
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const emojiContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!emojiContainerRef.current) return;
    isDragging.current = true;
    emojiContainerRef.current.classList.add("cursor-grabbing");
    startX.current = e.pageX - emojiContainerRef.current.offsetLeft;
    scrollLeft.current = emojiContainerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !emojiContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - emojiContainerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    emojiContainerRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleMouseUpLeave = () => {
    isDragging.current = false;
    if (emojiContainerRef.current) {
      emojiContainerRef.current.classList.remove("cursor-grabbing");
    }
  };

  return (
    <div className={cn(
        "w-full max-w-md bg-gray-900 rounded-2xl p-6 flex flex-col gap-4 relative",
        "shadow-2xl border border-purple-600", // Pop-up hissi için ek stiller
        className // app/map/page.tsx'ten gelen class'ları uygula
      )}
    >
      {/* ======== Kapatma butonu (X) kaldırıldı ======== */}
      {/* Önceki kodunuzdaki bu buton artık yok:
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors text-3xl font-bold"
        aria-label="Kapat"
      >
        &times; 
      </button> 
      */}
      {/* ============================================== */}

      <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        How is your mood today?
      </h2>

      {locationError && (
        <p className="text-red-400 text-center text-sm">Please allow location access!</p>
      )}

      <div
        ref={emojiContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpLeave}
        onMouseLeave={handleMouseUpLeave}
        className="grid grid-flow-col grid-rows-3 gap-3 pt-4 pb-2 overflow-x-auto scrollbar-hide cursor-grab select-none"
      >
        {moodsEmojis.map((e) => (
          <button
            key={e}
            onClick={() => setSelected(e)}
            className={`aspect-square rounded-xl text-4xl transition-all ${selected === e ? "ring-4 ring-purple-500 scale-110 bg-purple-900 shadow-xl" : "bg-gray-800 hover:bg-gray-700 hover:scale-105"}`}
          >
            {e}
          </button>
        ))}
      </div>

      <input
        type="text"
        maxLength={24}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Short status (optional)"
        className="bg-gray-700 rounded-xl px-4 py-3 text-base text-white focus:ring-2 focus:ring-purple-500 outline-none border border-transparent"
      />
      <div className="text-right text-sm text-gray-400">{note.length}/24</div>

      <div className="flex gap-4 w-full">
        <button
          onClick={() => onSubmit(selected!, note)} 
          disabled={!selected || locationError || loading} 
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 py-4 rounded-full text-xl font-bold shadow-xl flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin text-2xl" /> : "Add to Map 🚀"}
        </button>

        <button
          onClick={onClose}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-4 rounded-full text-xl font-bold shadow-xl transition-all flex items-center justify-center gap-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default MoodUpdateOverlay;