// src/components/MoodFeed.tsx
import React from 'react';

// ======== app/map/page.tsx dosyasındaki Mood tanımını buraya kopyala ========
// Bu tipi MoodFeed.tsx'in kendi içinde tanımlıyoruz.
// Eğer app/map/page.tsx'teki Mood tipine ek alanlar eklediysen (örn: username, locationLabel),
// buraya da eklemelisin ve aşağıdaki render kısmında kullanabilirsin.
export type Mood = { 
  id: string;
  emoji: string;
  status: string | null;
  lat: number;
  lng: number;
  fid: number; 
  user_id: string; 
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
                {/* Mood objende username alanı yok, fid veya user_id kullanabilirsin */}
                <p className="text-white text-lg font-semibold">User: {mood.fid || mood.user_id}</p> 
                {mood.status && <p className="text-slate-300 text-sm">"{mood.status}"</p>}
                <p className="text-slate-400 text-xs mt-1">
                  {/* created_at kullanarak tarihi gösteriyoruz */}
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