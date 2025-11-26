// app/map/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";
import { Navigation, Loader2 } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { toast, Toaster } from 'react-hot-toast'; 

import MoodUpdateOverlay from "@/components/MoodUpdateOverlay";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

import { useMap } from "react-leaflet"; 

// Supabase client created with anonymous key.
// No special session is needed for database operations, as RLS policies are public.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Mood type: fid is now NOT NULL, user_id (Privy DID) is stored for reference
type Mood = {
  id: string;
  emoji: string;
  status: string | null;
  lat: number;
  lng: number;
  fid: number; // Farcaster ID: Unique and cannot be null, key for upsert
  user_id: string; // Privy DID: Stored for reference
  created_at: string;
};

// FocusUserLocation bileşeni güncellendi: 'trigger' prop'u eklendi
const FocusUserLocation: React.FC<{ location: { lat: number; lng: number }, trigger: number }> = ({ location, trigger }) => {
  const map = useMap();

  // useEffect'in bağımlılıklarına 'trigger' eklendi
  useEffect(() => {
    // Sadece trigger değeri değiştiğinde (veya konum değiştiğinde) veya başlangıçta çalışır
    if (map && location) {
      (map as any).setView([location.lat, location.lng], 14, { animate: true });
    }
  }, [map, location, trigger]); // trigger'ı bağımlılık olarak ekledik

  return null;
};

export default function MapPage() {
  const router = useRouter();
  const { ready, authenticated, user, login } = usePrivy();

  const [moods, setMoods] = useState<Mood[]>([]);
  const [L, setL] = useState<any>(null); 
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [focusTrigger, setFocusTrigger] = useState(0); // shouldFocus yerine yeni state
  const [showMoodOverlay, setShowMoodOverlay] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const initialMoodCheckPerformed = useRef(false); 

  const fid = user?.farcaster?.fid; // Farcaster ID (number | undefined)
  const privyUserId = user?.id; // Privy's DID (string | undefined)

  // Redirect if Privy authentication status changes
  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/");
    }
  }, [ready, authenticated, router]);

  // Function to fetch moods from Supabase
  const fetchMoods = useCallback(async (focusOnUserAfterFetch = false) => {
    try {
      const { data, error } = await supabase.from("moods").select("*");
      if (error) {
        console.error("Error fetching moods:", error); 
        toast.error("Failed to load moods."); 
        setMoods([]); 
        return;
      }
      setMoods(data || []);

      // Check if the user has previously entered a mood (only for the first time)
      if (!initialMoodCheckPerformed.current && authenticated && fid !== undefined) {
        const hasUserMood = data.some(m => m.fid === fid);
        if (!hasUserMood) {
          setShowMoodOverlay(true);
          if (userLocation) {
            setFocusTrigger(prev => prev + 1); // shouldFocus yerine focusTrigger'ı artır
          }
        }
        initialMoodCheckPerformed.current = true; 
      }

      // focusOnUserAfterFetch durumunda da focusTrigger'ı artır
      if (focusOnUserAfterFetch && userLocation) {
        setFocusTrigger(prev => prev + 1);
      }
    } catch (e: any) {
      console.error("Unexpected error fetching moods:", e); 
      toast.error("An unexpected error occurred while loading moods: " + e.message);
    }
  }, [authenticated, fid, userLocation]);

  // Get Leaflet and user's location when the page loads
  useEffect(() => {
    Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")]).then(([leaflet]) => {
      setL(leaflet.default || leaflet);
    });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError(false);
        setFocusTrigger(prev => prev + 1); // Konum bulunduğunda haritayı odaklamak için trigger'ı artır
      },
      (err) => {
        console.error("Location permission denied:", err.message); 
        setLocationError(true);
        toast.error("Location permission denied. Map may not start at the correct location.");
      },
      { enableHighAccuracy: true }
    );
  }, []); 

  // Fetch moods when authentication status changes or FID is available
  useEffect(() => {
    if (ready && authenticated && fid !== undefined) {
      fetchMoods(); 
    }
  }, [ready, authenticated, fid, fetchMoods]); 

  // Using upsert for new mood entry/update operation
  const handleSubmitMood = async (emoji: string, status: string) => {
    if (!emoji || !userLocation || fid === undefined || privyUserId === undefined) { 
      toast.error("Please select an emoji, grant location access, and log in with Farcaster.");
      return;
    }
    setLoading(true);

    try {
      const { error: upsertError } = await supabase.from("moods").upsert(
        {
          fid: fid,               
          user_id: privyUserId,   
          emoji: emoji,
          status: status.slice(0, 24) || null,
          lat: userLocation.lat,
          lng: userLocation.lng,
        },
        { onConflict: 'fid' } 
      );

      if (upsertError) {
        console.error("Upsert Error (Supabase response):", upsertError); 
        toast.error("Failed to share mood: " + upsertError.message);
      }

      toast.success("Vibe successfully shared! 🌍");
      fetchMoods(true); 
      setShowMoodOverlay(false);
    } catch (error: any) {
      console.error("Unexpected error during mood operation:", error); 
      toast.error("An error occurred: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Loading screen conditions
  if (!ready || !authenticated || fid === undefined || privyUserId === undefined) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] flex flex-col items-center justify-center p-8 text-white">
            <Loader2 className="animate-spin text-purple-400 w-16 h-16 mb-4" />
            <p className="text-xl text-center">
              { !ready ? "Loading..." :
                !authenticated ? "Logging in..." :
                "Awaiting user info..."
              }
            </p>
        </div>
    );
  }

  // "Loading map" message if Leaflet is not yet loaded
  if (!L) return <div className="h-screen bg-black flex items-center justify-center text-white text-2xl">Loading map...</div>;

  const groups: Record<string, Mood[]> = {};
  moods.forEach((m) => {
    const key = `${m.lat.toFixed(4)}-${m.lng.toFixed(4)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  });

  const createIcon = (emoji: string, count: number) => {
    if (!L) return undefined; 

    const isCurrentUserSingleMood = count === 1 && moods.find(m => m.fid === fid && m.emoji === emoji);

    if (count === 1) {
      return L.divIcon({
        html: `<div style="font-size: 48px; filter: drop-shadow(0 0 12px ${isCurrentUserSingleMood ? 'rgba(168,85,247,0.7)' : 'black'});">${emoji}</div>`,
        className: "",
        iconSize: [48, 48],
        iconAnchor: [24, 48],
      });
    }

    return L.divIcon({
      html: `
        <div style="position: relative;">
          <div style="font-size: 48px; filter: drop-shadow(0 0 12px black);">${emoji}</div>
          <div style="position: absolute; top: -18px; right: -22px; background:#a855f7; color:white; font-weight:bold; font-size:22px; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:5px solid black; box-shadow: 0 0 25px #a855f7;">
            ${count}
          </div>
        </div>
      `,
      className: "",
      iconSize: [90, 90],
      iconAnchor: [45, 75],
    });
  };

  return (
    <div className="h-screen relative bg-black">
      <Toaster position="bottom-center" /> 

      <div className="absolute inset-0 z-0">
        <MapContainer
          center={userLocation || [20, 0]} 
          zoom={userLocation ? 13 : 2} 
          minZoom={2}
          maxZoom={18}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          worldCopyJump={false}
          maxBounds={[[-90, -180], [90, 180]]}
          maxBoundsViscosity={1.0}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" noWrap={true} />

          {/* FocusUserLocation bileşeni 'focusTrigger' prop'u ile render ediliyor */}
          {userLocation && <FocusUserLocation location={userLocation} trigger={focusTrigger} />}

          {Object.entries(groups).map(([groupKey, group]) => {
            const first = group[0]; 
            const currentUserMoodInGroup = group.find(m => m.fid === fid);
            const mainEmoji = currentUserMoodInGroup ? currentUserMoodInGroup.emoji : group[0].emoji;
            const count = group.length; 

            return (
              <Marker
                key={groupKey} 
                position={[first.lat, first.lng]}
                icon={L && L.divIcon ? createIcon(mainEmoji, count) : undefined}
              >
                <Popup className="custom-popup">
                  <div className="bg-[#0f0f23] p-6 rounded-3xl border border-purple-600 shadow-2xl min-w-[280px]">
                    {count > 1 && (
                      <div className="text-center text-purple-400 font-bold mb-4 text-xl">
                        {count} vibes here!
                      </div>
                    )}
                    <div className="space-y-3">
                      {group.map((m) => (
                        <div
                          key={m.id}
                          className={`flex items-center gap-3 p-2 rounded-xl ${
                            m.fid === fid ? 'bg-purple-800 border border-purple-500 shadow-lg' : 'bg-[#1a1a2e]'
                          }`}
                        >
                          <div className="text-4xl">{m.emoji}</div>
                          <div className="text-sm text-gray-300 flex-grow">
                            {m.status && <div className="italic">&quot;{m.status}&quot;</div>}
                          </div>
                          {m.fid === fid && (
                              <span className="text-purple-300 font-bold text-xs px-2 py-1 bg-purple-900 rounded-full">You</span>
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
      </div>

      <div className="absolute inset-0 z-50 pointer-events-none">
        <button
          onClick={() => fetchMoods(true)} 
          className="absolute top-4 right-4 z-50 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-full font-bold shadow-2xl transition-all pointer-events-auto text-white"
        >
          Refresh
        </button>

        {userLocation && (
          <button
            onClick={() => setFocusTrigger(prev => prev + 1)} // Buton tıklandığında focusTrigger'ı artır
            className="absolute bottom-24 right-4 z-50 bg-purple-600 hover:bg-purple-700 p-4 rounded-full shadow-2xl transition-all pointer-events-auto text-white"
          >
            <Navigation size={24} />
          </button>
        )}

        <button
          onClick={() => setShowMoodOverlay(true)}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-10 py-5 rounded-full font-bold text-xl shadow-2xl transition-all pointer-events-auto text-white"
        >
          Update Mood
        </button>
      </div>

      {showMoodOverlay && (
        <MoodUpdateOverlay
          onClose={() => setShowMoodOverlay(false)}
          onSubmit={handleSubmitMood}
          locationError={locationError || userLocation === null}
          loading={loading}
        />
      )}
    </div>
  );
}