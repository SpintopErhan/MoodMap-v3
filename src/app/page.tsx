"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { createClient } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const moods = [
  "🤩","😍","🥰","😘","😊","🙂","🤗","🤔","😐","😑","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","🥱",
  "😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢",
  "😭","😦","😧","😨","😩","🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","🥴","😠","😡","🤬","😷","🤒",
  "🤕","🤢","🤮","🤧","😇","🥺","🤠","🥳","😎","🤓","🧐","😋","😚","😙","🥲","😈","👿","💀","☠️","👻",
  "👽","🤖","💩","😺","😸","😹","😻","😼","😽","🙀","😿","😾","🙈","🙉","🙊","❤️","💔","💕","💞","💓","💗","💖"
];

export default function Home() {
  const { ready, authenticated, user, login } = usePrivy();
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [todayPosted, setTodayPosted] = useState(false);

  const fid = user?.farcaster?.fid;

  useEffect(() => {
    if (authenticated && fid) {
      navigator.geolocation.getCurrentPosition(
        pos => setLocation({lat: pos.coords.latitude, lng: pos.coords.longitude}),
        () => alert("Location permission needed!"),
        { enableHighAccuracy: true }
      );
      checkToday();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, fid]); // checkToday dependency uyarısını susturduk

  const checkToday = async () => {
    if (!fid) return;
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("moods").select("id").eq("fid", fid).eq("date", today);
    if (data?.length) setTodayPosted(true);
  };

  const submit = async () => {
    if (!selected || !location || !fid) return;
    setLoading(true);

    const { error } = await supabase.from("moods").insert({
      emoji: selected,
      status: note.slice(0, 24) || null,
      lat: location.lat,
      lng: location.lng,
    });

    setLoading(false);

    if (error) {
      console.error("Supabase error:", error);
      alert("Hata: " + error.message);
    } else {
      alert("Mood added to the map! 🌍");
      window.location.href = "/map";
    }
  };

  if (!ready || !authenticated) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f23]">
      <button onClick={login} className="bg-purple-600 hover:bg-purple-700 px-12 py-6 rounded-full text-2xl font-bold shadow-2xl">
        Sign in with Farcaster
      </button>
    </div>
  );

  if (todayPosted) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-[#0f0f23]">
      <p className="text-3xl text-center">You&apos;ve already shared your mood today!</p>
      <a href="/map" className="bg-purple-600 px-12 py-6 rounded-full text-2xl font-bold shadow-2xl">View Map</a>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0f23] p-6 flex flex-col">
      <h1 className="text-5xl font-bold text-center mb-10 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        How is your mood today?
      </h1>
      <div className="grid grid-cols-6 gap-4 mb-8 overflow-y-auto max-h-[60vh]">
        {moods.map(e => (
          <button key={e} onClick={() => setSelected(e)} className={`aspect-square rounded-2xl text-5xl transition-all ${selected === e ? "ring-4 ring-purple-500 scale-110 bg-purple-900 shadow-2xl" : "bg-gray-800 hover:bg-gray-700 hover:scale-105"}`}>
            {e}
          </button>
        ))}
      </div>
      <input maxLength={24} value={note} onChange={e => setNote(e.target.value)} placeholder="Short status (optional)" className="bg-gray-800 rounded-xl px-6 py-4 text-lg mb-2"/>
      <div className="text-right text-sm text-gray-500 mb-6">{note.length}/24</div>
      <button onClick={submit} disabled={!selected || !location || loading} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 py-6 rounded-full text-2xl font-bold shadow-2xl flex items-center justify-center gap-4">
        {loading ? <Loader2 className="animate-spin text-3xl"/> : "Add to Map 🚀"}
      </button>
    </div>
  );
}