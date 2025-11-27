// src/components/MoodFeed.tsx
import React from 'react';

// ======== Mood Tanımı Güncellendi (location eklendi) ========
// app/map/page.tsx dosyasındaki Mood tanımını buraya kopyala
// Bu tipi MoodFeed.tsx'in kendi içinde tanımlıyoruz.
// user_name alanı ve YENİ olarak location alanı buraya eklendi.
export type Mood = { 
  id: string;
  emoji: string;
  status: string | null;
  lat: number;
  lng: number;
  fid: number; 
  user_id: string; 
  user_name: string; 
  location: string | null; // YENİ: Reverse geocoded konum stringi eklendi
  created_at: string;
};
// ============================================================================

interface MoodFeedProps {
  moods: Mood[]; 
}

export const MoodFeed: React.FC<MoodFeedProps> = ({ moods }) => {
  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold text-white mb-4 text-center">Recent Moods</h2>
      {moods.length === 0 ? (
        <p className="text-center text-slate-500 mt-4">There are no moods yet. Be the first to share your mood!</p>
      ) : (
        <ul className="space-y-4 overflow-y-auto flex-grow">
          {moods.map((mood) => (
            <li
              key={mood.id}
              className="bg-slate-800/80 p-4 rounded-xl shadow-lg flex items-center space-x-4"
            >
              <span className="text-4xl">{mood.emoji}</span>
              <div>
                <p className="text-white text-lg font-semibold"> {mood.user_name}</p> 
                {mood.status && <p className="text-slate-300 text-sm">"{mood.status}"</p>}
                {/* YENİ: Location bilgisini gösteriyoruz */}
                {mood.location && <p className="text-slate-400 text-xs mt-1">{mood.location}</p>} 
                <p className="text-slate-400 text-xs mt-1">
                  {new Date(mood.created_at).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};