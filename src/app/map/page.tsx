"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";

// Leaflet bileşenlerini dynamic import et
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Mood = {
  id: string;
  emoji: string;
  status: string | null;
  lat: number;
  lng: number;
};

export default function MapPage() {
  const [moods, setMoods] = useState<Mood[]>([]);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    // Leaflet + CSS'i sadece client-side yükle
    Promise.all([
      import("leaflet"),
      import("leaflet/dist/leaflet.css"),
    ]).then(([leaflet]) => {
      setL(leaflet.default || leaflet);
    });
  }, []);

  useEffect(() => {
    fetchMoods();
  }, []);

  const fetchMoods = async () => {
    const { data } = await supabase.from("moods").select("*");
    setMoods(data || []);
  };

  if (!L) {
    return <div className="h-screen bg-black flex items-center justify-center text-white text-2xl">Loading map...</div>;
  }

  // Gruplama
  const groups: Record<string, Mood[]> = {};
  moods.forEach((m) => {
    const key = `${m.lat.toFixed(3)}-${m.lng.toFixed(3)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  });

  const createIcon = (emoji: string, count: number) => {
    if (count === 1) {
      return L.divIcon({
        html: `<div style="font-size: 48px; filter: drop-shadow(0 0 12px black);">${emoji}</div>`,
        className: "",
        iconSize: [48, 48],
        iconAnchor: [24, 48],
      });
    }

    return L.divIcon({
      html: `
        <div style="position: relative;">
          <div style="font-size: 48px; filter: drop-shadow(0 0 12px black);">${emoji}</div>
          <div style="position: absolute; top: -16px; right: -20px; background:#a855f7; color:white; font-weight:bold; font-size:20px; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:4px solid black; box-shadow: 0 0 20px #a855f7;">
            ${count}
          </div>
        </div>
      `,
      className: "",
      iconSize: [80, 80],
      iconAnchor: [40, 70],
    });
  };

  return (
    <div className="h-screen relative bg-black">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={2}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        {Object.values(groups).map((group) => {
          const first = group[0];
          const mainEmoji = group[0].emoji;
          const count = group.length;

          return (
            <Marker
              key={first.id}
              position={[first.lat, first.lng]}
              icon={createIcon(mainEmoji, count)}
            >
              <Popup className="custom-popup">
                <div className="bg-[#0f0f23] p-6 rounded-3xl border border-purple-600 shadow-2xl">
                  {count > 1 && (
                    <div className="text-center text-purple-400 font-bold mb-4 text-xl">
                      {count} moods here
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-6">
                    {group.map((m) => (
                      <div key={m.id} className="text-center">
                        <div className="text-7xl mb-3">{m.emoji}</div>
                        {m.status && (
                          <div className="text-xs text-gray-400 italic mt-2 break-words max-w-32">
                            &quot;{m.status}&quot;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <button
        onClick={fetchMoods}
        className="absolute top-4 right-4 z-10 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-full font-bold shadow-2xl transition-all"
      >
        Refresh
      </button>

      <button
        onClick={() => (window.location.href = "/")}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-10 py-5 rounded-full font-bold text-xl shadow-2xl transition-all"
      >
        Update Status
      </button>
    </div>
  );
}