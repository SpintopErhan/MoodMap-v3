// app/map/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react"; 
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";
import { Loader2, MapPin, TestTube2, Send } from "lucide-react"; 
import { useRouter } from "next/navigation";
import { toast, Toaster } from 'react-hot-toast'; 

// Bileşenlerin importları. tsconfig.json'daki paths ayarı ( @/*": ["./src/*"] ) dikkate alınmıştır.
import MoodUpdateOverlay from "@/components/MoodUpdateOverlay"; 
import { Button } from "@/components/Button"; 
import { MoodFeed } from "@/components/MoodFeed"; 

// Leaflet dinamik importları
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

import { useMap } from "react-leaflet"; 

// Sabitler
const MOOD_STATUS_MAX_LENGTH = 24;
const MOOD_MARKER_SIZE = 52;
const MOOD_MARKER_ANCHOR_OFFSET = MOOD_MARKER_SIZE / 2;


// Supabase client created with anonymous key.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ======== MOOD TİPİ GÜNCELLENDİ (location eklendi) ========
export type Mood = { 
  id: string;
  emoji: string;
  status: string | null;
  lat: number;
  lng: number;
  fid: number; 
  user_id: string; 
  user_name: string; 
  location: string | null; // YENİ: Reverse geocoded konum stringi
  created_at: string;
};
// ==========================================================

// YENİ: Demo mood'ları için sabit veri
const DEMO_MOODS_DATA: Mood[] = [
  {
    id: "demo-1", emoji: "😊", status: "Nice weather!", fid: 10001, user_id: "demo_user_1", user_name: "DemoUser1",
    lat: 40.9934, lng: 29.0278, location: "Kadıköy, İstanbul, Türkiye", created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: "demo-2", emoji: "☕", status: "Coffee time", fid: 10002, user_id: "demo_user_2", user_name: "DemoUser2",
    lat: 40.9876, lng: 29.0345, location: "Kadıköy, İstanbul, Türkiye", created_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: "demo-3", emoji: "📚", status: "Reading a book", fid: 10003, user_id: "demo_user_3", user_name: "DemoUser3",
    lat: 40.9991, lng: 29.0189, location: "Kadıköy, İstanbul, Türkiye", created_at: new Date(Date.now() - 10800000).toISOString()
  },
  {
    id: "demo-4", emoji: "🥳", status: "Party time!", fid: 10004, user_id: "demo_user_4", user_name: "DemoUser4",
    lat: 40.9900, lng: 29.0220, location: "Kadıköy, İstanbul, Türkiye", created_at: new Date(Date.now() - 14400000).toISOString()
  },
  {
    id: "demo-5", emoji: "🌧️", status: "Rainy day", fid: 10005, user_id: "demo_user_5", user_name: "DemoUser5",
    lat: 40.9850, lng: 29.0300, location: "Kadıköy, İstanbul, Türkiye", created_at: new Date(Date.now() - 18000000).toISOString()
  },
  { 
    id: "demo-6", emoji: "⛰️", status: "Hiking", fid: 10006, user_id: "DemoUser6", user_name: "DemoUser6",
    lat: 41.0082, lng: 28.9784, location: "Beyoğlu, İstanbul, Türkiye", created_at: new Date(Date.now() - 21600000).toISOString()
  }
];
// ==========================================================

// YENİ: Reverse Geocoding Fonksiyonu (Konum koordinatlarından isim almak için)
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;
  if (!apiKey) {
    console.error("OpenCage API key is not set. Please add NEXT_PUBLIC_OPENCAGE_API_KEY to your .env.local");
    toast.error("Location lookup failed: API key missing.");
    return null;
  }
  try {
    const response = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${apiKey}&language=tr` 
    );
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const components = data.results[0].components;
      const locationParts: string[] = []; 

      if (components.city) locationParts.push(components.city);
      else if (components.town) locationParts.push(components.town);
      else if (components.village) locationParts.push(components.village);

      if (components.state) locationParts.push(components.state); 
      else if (components.province) locationParts.push(components.province); 

      if (components.country) locationParts.push(components.country); 
      
      return locationParts.length > 0 ? locationParts.join(', ') : data.results[0].formatted;
    }
    console.warn("No geocoding results found for:", lat, lng);
    return null;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    toast.error("Failed to look up location details.");
    return null;
  }
}

// YENİ: Forward Geocoding Fonksiyonu (Konum isminden koordinat almak için)
async function forwardGeocode(locationString: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;
  if (!apiKey) {
    console.error("OpenCage API key is not set for forward geocoding.");
    return null;
  }
  try {
    const response = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(locationString)}&key=${apiKey}&language=tr&limit=1`
    );
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry;
      return { lat, lng };
    }
    console.warn("No forward geocoding results found for:", locationString);
    return null;
  } catch (error) {
    console.error("Forward geocoding error for location string:", locationString, error);
    return null;
  }
}


// Harita odaklansın diye
const FocusUserLocation: React.FC<{ location: { lat: number; lng: number }, trigger: number }> = ({ location, trigger }) => {
  const map = useMap();

  useEffect(() => {
    if (map && location) {
      (map as any).setView([location.lat, location.lng], 14, { animate: true });
    }
  }, [map, location, trigger]); 

  return null;
};

export default function MapPage() {
  const router = useRouter();
  const [farcasterUser, setFarcasterUser] = useState<{ fid: number; username: string; display_name: string; pfp_url: string } | null>(null);
  const [isFarcasterMiniApp, setIsFarcasterMiniApp] = useState(false);

  const [moods, setMoods] = useState<Mood[]>([]);
  const [L, setL] = useState<any>(null); // Leaflet objesini tutar
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodedLocation, setGeocodedLocation] = useState<string | null>(null); 
  const [locationError, setLocationError] = useState(false);
  const [focusTrigger, setFocusTrigger] = useState(0); 
  const [showMoodOverlay, setShowMoodOverlay] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [isMoodFeedOpen, setIsMoodFeedOpen] = useState(false); 
  
  const initialMoodCheckPerformed = useRef(false); 

  const [geocodedGroupLocations, setGeocodedGroupLocations] = useState<Record<string, { lat: number; lng: number }>>({});
  const geocodingCache = useRef<Record<string, { lat: number; lng: number } | null>>({});

  const fid = farcasterUser?.fid; 
  const privyUserId = farcasterUser?.fid ? `fc_user_${farcasterUser.fid}` : undefined; 
  const userName = farcasterUser?.username;

  const showDemoButton = process.env.NEXT_PUBLIC_ENABLE_DEMO_BUTTON === 'true';
  const [showDemoMoods, setShowDemoMoods] = useState(showDemoButton); 

  const currentUserLatestMood = useMemo(() => {
    if (!fid || !moods.length) return null;
    const userMoods = moods.filter(m => m.fid === fid);
    return userMoods.length > 0 ? userMoods[0] : null; 
  }, [moods, fid]);

 // Farcaster Mini App'ten kullanıcı bilgilerini al
useEffect(() => {
  // window.farcaster sadece Mini App'te var → any ile güvenli kontrol
  const farcaster = (window as any).farcaster;

  if (farcaster?.getUser) {
    setIsFarcasterMiniApp(true);

    const getUserInfo = async () => {
      try {
        const user = await farcaster.getUser();
        if (user) {
          setFarcasterUser(user);
        } else {
          router.replace("/");
        }
      } catch (error) {
        console.error("Farcaster user info fetching error:", error);
        router.replace("/");
      }
    };

    getUserInfo();
  } else {
    setIsFarcasterMiniApp(false);
    router.replace("/");
  }
}, [router]);

  // ======== Hata Ayıklama Logları Başlangıcı ========
  useEffect(() => {
    console.log("Cast Button Conditions:");
    console.log("  - Farcaster Mini App:", isFarcasterMiniApp);
    console.log("  - Farcaster FID:", fid);
    // window.farcaster.actions.sendCast kontrolü hala doğru
    console.log("  - Farcaster SDK actions.sendCast available:", typeof window !== "undefined" && !!window.farcaster?.actions?.sendCast); 
    console.log("  - currentUserLatestMood:", currentUserLatestMood);
    if (currentUserLatestMood) {
      console.log("    - currentUserLatestMood.id:", currentUserLatestMood.id);
      console.log("    - currentUserLatestMood.fid (matched):", currentUserLatestMood.fid === fid);
    }
    const canShowCastButton = isFarcasterMiniApp && fid !== undefined && typeof window !== "undefined" && !!window.farcaster?.actions?.sendCast && !!currentUserLatestMood;
    console.log("  - Overall canShowCastButton:", canShowCastButton);
  }, [isFarcasterMiniApp, fid, currentUserLatestMood]);
  // ======== Hata Ayıklama Logları Sonu ========

  const fetchMoods = useCallback(async (focusOnUserAfterFetch = false) => {
    try {
      const { data, error } = await supabase.from("moods").select("*").order('created_at', { ascending: false }); 
      if (error) {
        console.error("Error fetching moods:", error); 
        toast.error("Failed to load moods."); 
        setMoods([]); 
        return;
      }
      
      let fetchedMoods = data || [];
      if (showDemoMoods && showDemoButton) { 
        fetchedMoods = [...DEMO_MOODS_DATA, ...fetchedMoods];
      }
      setMoods(fetchedMoods); 

      if (!initialMoodCheckPerformed.current && farcasterUser) {
        const hasUserMood = fetchedMoods.some(m => m.fid === farcasterUser.fid); 
        if (!hasUserMood) {
          setShowMoodOverlay(true);
          if (userLocation) {
            setFocusTrigger(prev => prev + 1); 
          }
        }
        initialMoodCheckPerformed.current = true; 
      }

      if (focusOnUserAfterFetch && userLocation) {
        setFocusTrigger(prev => prev + 1);
      }
    } catch (e: any) {
      console.error("Unexpected error fetching moods:", e); 
      toast.error("An unexpected error occurred while loading moods: " + e.message);
    }
  }, [farcasterUser, userLocation, showDemoMoods, showDemoButton]); 

  useEffect(() => {
    if (!isFarcasterMiniApp || !farcasterUser) {
      return; 
    }
    fetchMoods(); 
  }, [isFarcasterMiniApp, farcasterUser, fetchMoods]); 

  useEffect(() => {
    if (isFarcasterMiniApp && farcasterUser) { 
      fetchMoods(); 
    }
  }, [isFarcasterMiniApp, farcasterUser, fetchMoods]); 


  useEffect(() => {
    Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")]).then(([leaflet]) => {
      setL(leaflet.default || leaflet);
    });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError(false);
        setFocusTrigger(prev => prev + 1); 
      },
      (err) => {
        console.error("Location permission denied:", err.message); 
        setLocationError(true);
        toast.error("Location permission denied. Map may not start at the correct location.");
      },
      { enableHighAccuracy: true }
    );
  }, []); 

  useEffect(() => {
    if (userLocation) {
      const getGeocodedLocation = async () => {
        const locationString = await reverseGeocode(userLocation.lat, userLocation.lng);
        setGeocodedLocation(locationString);
      };
      getGeocodedLocation();
    } else {
      setGeocodedLocation(null); 
    }
  }, [userLocation]); 

  useEffect(() => {
    const uniqueLocations = Array.from(new Set(moods.map(m => m.location).filter(Boolean) as string[]));
    
    const fetchGroupCoordinates = async () => {
      const newGeocodedLocations: Record<string, { lat: number; lng: number }> = {};
      for (const loc of uniqueLocations) {
        if (geocodingCache.current[loc] !== undefined) { 
          if (geocodingCache.current[loc]) { 
            newGeocodedLocations[loc] = geocodingCache.current[loc]!;
          }
          continue; 
        }

        const coords = await forwardGeocode(loc);
        geocodingCache.current[loc] = coords; 
        if (coords) {
          newGeocodedLocations[loc] = coords;
        }
      }
      setGeocodedGroupLocations(prev => ({ ...prev, ...newGeocodedLocations }));
    };

    if (uniqueLocations.length > 0) {
      fetchGroupCoordinates();
    }
  }, [moods]); 

  const handleSubmitMood = async (emoji: string, status: string) => { 
    if (!emoji || !userLocation || fid === undefined || privyUserId === undefined || userName === undefined) { 
      toast.error("Please select an emoji, grant location access, and ensure you're logged in with Farcaster.");
      return;
    }
    
    setLoading(true);

    try {
      const { error: upsertError } = await supabase.from("moods").upsert(
        {
          fid: fid,               
          user_id: privyUserId,   
          user_name: userName, 
          emoji: emoji,
          status: status.slice(0, MOOD_STATUS_MAX_LENGTH) || null, 
          lat: userLocation.lat,
          lng: userLocation.lng,
          location: geocodedLocation, 
        },
        { onConflict: 'fid' } 
      );

      if (upsertError) {
        console.error("Upsert Error (Supabase response):", upsertError); 
        toast.error("Failed to share mood: " + upsertError.message);
      } else {
        toast.success("Vibe successfully shared! 🌍 You can now cast it to Farcaster!");
      }
      
      fetchMoods(true); 
      setShowMoodOverlay(false); 
    } catch (error: any) {
      console.error("Unexpected error during mood operation:", error); 
      toast.error("An error occurred: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCastLatestMood = useCallback(async () => { 
    // Doğrudan window.farcaster.actions.sendCast kullanıyoruz
    if (!isFarcasterMiniApp || !window.farcaster?.actions?.sendCast || !currentUserLatestMood || !userName) {
      toast.error("You need to be in a Farcaster Mini App and have a mood to cast.");
      return;
    }

    try {
      let castText = `${currentUserLatestMood.emoji} ${userName} is feeling this vibe`;
      if (currentUserLatestMood.status) {
        castText += `: "${currentUserLatestMood.status.slice(0, MOOD_STATUS_MAX_LENGTH)}"`;
      }
      if (currentUserLatestMood.location) {
        castText += ` from ${currentUserLatestMood.location}`;
      }
      castText += ` #MoodMap`; 
      
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moodmap.vercel.app'; 
      if (appUrl) {
        castText += `\n${appUrl}`; 
      }
      
      // window.farcaster.actions.sendCast çağrısı doğru yolda
      await window.farcaster.actions.sendCast({ text: castText });
      toast.success("Mood successfully cast to Farcaster! ✨");
    } catch (castError: any) {
      console.error("Farcaster cast error:", castError);
      toast.error("Failed to cast to Farcaster: " + castError.message);
    }
  }, [isFarcasterMiniApp, currentUserLatestMood, userName]); 


  const handleMapAction = useCallback(() => { 
    if (userLocation) {
      setFocusTrigger(prev => prev + 1); 
    }
    setShowMoodOverlay(false);
    setIsMoodFeedOpen(false);
    toast.success("Map focused on your location.");
  }, [userLocation]); 

  const handleToggleMoodFeed = useCallback(() => { 
    setIsMoodFeedOpen((prev) => !prev);
    if (showMoodOverlay) setShowMoodOverlay(false);
  }, [showMoodOverlay]);


  if (!isFarcasterMiniApp || !farcasterUser) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] flex flex-col items-center justify-center p-8 text-white">
            <Loader2 className="animate-spin text-purple-400 w-16 h-16 mb-4" />
            <p className="text-xl text-center">
              {!isFarcasterMiniApp ? "Please open this app in a Farcaster client." : "Authenticating Farcaster user..."}
            </p>
        </div>
    );
  }


  if (!L) return <div className="h-screen bg-black flex items-center justify-center text-white text-2xl">Loading map...</div>;

  const groups: Record<string, Mood[]> = {};
  moods.forEach((m) => {
    const key = m.location && m.location.trim() !== '' 
      ? m.location 
      : null; 
      
    if (key) { 
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
  });

  const createIcon = (emoji: string, count: number) => {
    const isCurrentUserSingleMood = count === 1 && moods.some(m => m.fid === fid && m.emoji === emoji);
    const filterShadow = `drop-shadow(0 0 12px ${isCurrentUserSingleMood ? 'rgba(168,85,247,0.7)' : 'black'})`;

    if (count === 1) {
      return L.divIcon({
        html: `<div class="mood-marker-icon" style="font-size: 2rem; ${filterShadow}">${emoji}</div>`,
        className: "", 
        iconSize: [MOOD_MARKER_SIZE, MOOD_MARKER_SIZE], 
        iconAnchor: [MOOD_MARKER_ANCHOR_OFFSET, MOOD_MARKER_ANCHOR_OFFSET], 
      });
    }

    return L.divIcon({
      html: `<div class="mood-marker-icon" style="font-size: 1.8rem; font-weight: bold; filter: drop-shadow(0 0 12px black);">${count}</div>`, 
      className: "", 
      iconSize: [MOOD_MARKER_SIZE, MOOD_MARKER_SIZE], 
      iconAnchor: [MOOD_MARKER_ANCHOR_OFFSET, MOOD_MARKER_ANCHOR_OFFSET], 
    });
  };

  return (
    <div className="h-screen relative bg-black">
      <Toaster position="top-center" /> 

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

          {userLocation && <FocusUserLocation location={userLocation} trigger={focusTrigger} />}

          {Object.entries(groups).map(([groupKey, group]) => {
            const markerCoords = geocodedGroupLocations[groupKey];
            
            if (!markerCoords) {
              return null;
            }
            
            const currentUserMoodInGroup = group.find(m => m.fid === fid);
            const mainEmoji = currentUserMoodInGroup ? currentUserMoodInGroup.emoji : group[0].emoji; 
            const count = group.length; 

            return (
              <Marker
                key={groupKey} 
                position={[markerCoords.lat, markerCoords.lng]} 
                icon={L && L.divIcon ? createIcon(mainEmoji, count) : undefined}
              >
                <Popup closeButton={false} className="custom-popup" offset={[0, -20]}> 
                  <div className="bg-[#0f0f23] p-6 rounded-3xl border border-purple-600 shadow-2xl min-w-[280px]">
                    <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-hide mb-1"> 
                      {group.map((m) => (
                        <div
                          key={m.id}
                          className={`flex items-center gap-3 p-2 rounded-xl ${
                            m.fid === fid ? 'bg-purple-800 border border-purple-500 shadow-lg' : 'bg-[#1a1a2e]'
                          }`}
                        >
                          <div className="text-4xl">{m.emoji}</div>
                          <div className="text-sm text-gray-300 flex-grow">
                            <div className="font-semibold text-white">{m.user_name}</div> 
                            {m.status && <div className="italic">&quot;{m.status}&quot;</div>}
                            {m.location && <div className="text-gray-400 text-xs mt-1">{m.location}</div>} 
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

      {/* ======== YENİ: Harita Butonu (Sağ Üst Köşede) ======== */}
      {farcasterUser && userLocation && ( 
        <div className="fixed top-16 right-4 z-[1000]"> 
          <Button
            onClick={handleMapAction}
            variant="secondary"
            className="w-14 h-14 rounded-full backdrop-blur-md bg-slate-800/70 border border-slate-700 text-white shadow-xl hover:bg-slate-700/80 transition-colors flex items-center justify-center" 
          >
            <MapPin size={28} /> 
          </Button>
        </div>
      )}
      {/* ==================================================== */}

      {/* ======== SABİT ALT BUTONLAR ALANI ======== */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 z-[1000]">
        {showDemoButton && (
          <Button
            onClick={() => setShowDemoMoods(prev => {
              toast.success(prev ? "Demo Moods Hidden" : "Demo Moods Shown");
              return !prev;
            })}
            variant="secondary" 
            className={`px-4 py-3 text-lg rounded-full backdrop-blur-md bg-slate-800/70 border ${showDemoMoods ? 'border-green-500 text-green-300' : 'border-slate-700 text-white'} shadow-xl hover:bg-slate-700/80 transition-colors`}
          >
            <TestTube2 size={20} className="mr-2" /> {showDemoMoods ? "Hide Demo" : "Show Demo"}
          </Button>
        )}

                {/* YENİ: Farcaster'a Cast Atma Butonu */}
        {farcasterUser && currentUserLatestMood && isFarcasterMiniApp && typeof window !== "undefined" && window.farcaster?.actions?.sendCast && (
          <Button
            onClick={handleCastLatestMood}
            className="px-6 py-3 text-lg rounded-full shadow-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white transform hover:scale-105 transition-transform duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
          >
            <Send size={20} className="mr-2" /> Cast
          </Button>
        )}

        <Button
          onClick={() => setShowMoodOverlay(true)} 
          className="w-16 h-16 rounded-full text-3xl font-bold shadow-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white transform hover:scale-105 transition-transform duration-200 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-50"
        >
          +
        </Button>

        <Button
          onClick={handleToggleMoodFeed}
          variant="secondary"
          className="px-6 py-3 text-lg rounded-full backdrop-blur-md bg-slate-800/70 border border-slate-700 text-white shadow-xl hover:bg-slate-700/80 transition-colors relative"
        >
          Feeds 
          {moods.length > 0 && (
            <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full absolute -top-2 -right-2 transform translate-x-1/2 -translate-y-1/2">
              {moods.length}
            </span>
          )}
        </Button>
      </div>
      {/* ==================================================================== */}

      {/* Mood Güncelleme Overlay'i (Pop-up kart olarak konumlandırılıyor) */}
      {showMoodOverlay && (
        <>
          <div className="fixed inset-0 bg-transparent z-[1040]" onClick={() => setShowMoodOverlay(false)}></div>
          <MoodUpdateOverlay
            onClose={() => setShowMoodOverlay(false)}
            onSubmit={handleSubmitMood} 
            locationError={locationError || userLocation === null}
            loading={loading}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[1050] max-w-sm w-[calc(100%-2rem)] md:max-w-md" 
          />
        </>
      )}

      {/* ======== MOOD FEED (ALTTAN KAYAN PANEL) ======== */}
      <div
        className={`fixed inset-x-0 bottom-0 max-h-[80%] h-2/3 md:h-1/2 bg-slate-900/95 backdrop-blur-xl z-[990]
                    transform transition-transform duration-500 ease-in-out rounded-t-3xl
                    ${isMoodFeedOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <MoodFeed moods={moods} /> 
        <button
          onClick={() => setIsMoodFeedOpen(false)}
          className="absolute top-2 right-4 text-slate-400 hover:text-white transition-colors text-xl font-bold z-10"
          aria-label="Close Feeds" 
        >
          &times;
        </button>
      </div>
      {/* ==================================================== */}
    </div>
  );
}