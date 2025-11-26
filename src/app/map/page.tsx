// app/map/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";
import { Navigation, Loader2, MapPin } from "lucide-react"; 
import { usePrivy } from "@privy-io/react-auth";
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

// Supabase client created with anonymous key.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ======== MOOD TİPİ ========
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
// ==========================

// Leaflet'ın varsayılan ikonlarını geçersiz kılmak için gerekli (Next.js ile kullanırken)
// Bu kod satırı global leaflet.css'in doğru yüklenmesini sağlar
// Normalde bu L.Icon.Default.mergeOptions ile yapılırdı ama dinamik import nedeniyle burada L'yi kullanmadan yapılır.
// Eğer bu hata veriyorsa, app/layout.tsx veya benzeri bir root dosyada bunu manuel olarak Leaflet importu sonrası deneyebilirsiniz.
// Ancak bizim divIcon yaklaşımımızla varsayılan ikonlar yerine özel ikonlar kullandığımız için bu kısım artık daha az kritik.
// delete (L.Icon.Default.prototype as any)._get  ; // Bu satır L tanımlı olmadığı için sorun çıkarabilir, bu yüzden kaldırıldı.

// LocationMarker bileşeni KULLANICI İSTEĞİ ÜZERİNE KALDIRILDI
/*
const LocationMarker: React.FC<{ location: { lat: number; lng: number } | null, setLocation: (latlng: any) => void, userLocationIcon: any }> = ({ location, setLocation, userLocationIcon }) => {
  const map = useMap();

  useEffect(() => {
    map.locate().on('locationfound', function (e) {
      setLocation(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    });
    map.locate().on('locationerror', function (e) {
        console.error("Location error:", e.message);
    });
  }, [map, setLocation]);

  return location === null || !userLocationIcon ? null : (
    <Marker position={location} icon={userLocationIcon}>
      <Popup>Buradasınız</Popup>
    </Marker>
  );
};
*/

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
  const { ready, authenticated, user } = usePrivy(); 

  const [moods, setMoods] = useState<Mood[]>([]);
  const [L, setL] = useState<any>(null); // Leaflet objesini tutar
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [focusTrigger, setFocusTrigger] = useState(0); 
  const [showMoodOverlay, setShowMoodOverlay] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [isMoodFeedOpen, setIsMoodFeedOpen] = useState(false); 
  
  const initialMoodCheckPerformed = useRef(false); 

  const fid = user?.farcaster?.fid; 
  const privyUserId = user?.id; 

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/");
    }
  }, [ready, authenticated, router]);

  const fetchMoods = useCallback(async (focusOnUserAfterFetch = false) => {
    try {
      const { data, error } = await supabase.from("moods").select("*").order('created_at', { ascending: false }); 
      if (error) {
        console.error("Error fetching moods:", error); 
        toast.error("Failed to load moods."); 
        setMoods([]); 
        return;
      }
      setMoods(data || []);

      if (!initialMoodCheckPerformed.current && authenticated && fid !== undefined) {
        const hasUserMood = data.some(m => m.fid === fid);
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
  }, [authenticated, fid, userLocation]);

  useEffect(() => {
    Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")]).then(([leaflet]) => {
      setL(leaflet.default || leaflet);
    });

    // Kullanıcının mevcut konumunu almak için navigator.geolocation kullanılır.
    // LocationMarker kaldırıldığından, harita üzerinde "Buradasınız" ikonu görünmeyecek,
    // ancak konum bilgisi hala alınacak ve harita bu konuma odaklanabilir.
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
    if (ready && authenticated && fid !== undefined) {
      fetchMoods(); 
    }
  }, [ready, authenticated, fid, fetchMoods]); 

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
      } else {
        toast.success("Vibe successfully shared! 🌍");
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

  const handleMapAction = () => {
    if (userLocation) {
      setFocusTrigger(prev => prev + 1); 
    }
    setShowMoodOverlay(false);
    setIsMoodFeedOpen(false);
    toast.success("Map focused on your location.");
  };

  const handleToggleMoodFeed = () => {
    setIsMoodFeedOpen((prev) => !prev);
    if (showMoodOverlay) setShowMoodOverlay(false);
  };

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

  if (!L) return <div className="h-screen bg-black flex items-center justify-center text-white text-2xl">Loading map...</div>;

  const groups: Record<string, Mood[]> = {};
  moods.forEach((m) => {
    const key = `${m.lat.toFixed(4)}-${m.lng.toFixed(4)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  });

  // Kullanıcının mevcut konum ikonu için sabit bir ikon tanımlaması KULLANICI İSTEĞİ ÜZERİNE KALDIRILDI
  /*
  const userLocationIcon = L.divIcon({
    html: `<div class="mood-marker-icon" style="font-size: 2.5rem; filter: drop-shadow(0 0 12px rgba(168,85,247,0.7));">&#128205;</div>`, // '📍' emoji code
    className: '', // Kendi stilimiz .mood-marker-icon'da olduğu için Leaflet'ın varsayılanlarını devre dışı bırak
    iconSize: [52, 52], // Dairenin boyutuna göre
    iconAnchor: [26, 26], // Dairenin merkezini işaret et
  });
  */

  const createIcon = (emoji: string, count: number) => {
    if (!L) return undefined; 

    const moodCircleSize = 52; // Tüm özel marker'lar için tutarlı boyut
    const iconAnchorOffset = moodCircleSize / 2; // Marker'ı merkezine hizalar

    // Marker'ın mevcut kullanıcıya ait bir ruh hali olup olmadığını belirle
    const isCurrentUserSingleMood = count === 1 && moods.some(m => m.fid === fid && m.emoji === emoji);
    const filterShadow = `drop-shadow(0 0 12px ${isCurrentUserSingleMood ? 'rgba(168,85,247,0.7)' : 'black'})`;

    if (count === 1) {
      // Tekli Mood: Yuvarlak stil için .mood-marker-icon sınıfını kullanır
      // Emoji'nin boyutunu doğrudan HTML içinde ayarlarız (2.5rem olarak güncellendi).
      return L.divIcon({
        html: `<div class="mood-marker-icon" style="font-size: 2rem; ${filterShadow}">${emoji}</div>`,
        className: "", // Leaflet'ın varsayılan className'ini devre dışı bırakır
        iconSize: [moodCircleSize, moodCircleSize],
        iconAnchor: [iconAnchorOffset, iconAnchorOffset],
      });
    }

    // Gruplanmış Mood'lar: Sayıyı .mood-marker-icon dairesinin içine yerleştirir.
    // Gruplanmış ikonlar için gölgeyi siyah yaparız.
    return L.divIcon({
      html: `<div class="mood-marker-icon" style="font-size: 1.8rem; font-weight: bold; filter: drop-shadow(0 0 12px black);">${count}</div>`, // Kalın metinle sayı
      className: "", // Leaflet'ın varsayılan className'ini devre dışı bırakır
      iconSize: [moodCircleSize, moodCircleSize],
      iconAnchor: [iconAnchorOffset, iconAnchorOffset],
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

          {/* LocationMarker bileşeni KULLANICI İSTEĞİ ÜZERİNE KALDIRILDI */}
          {/* <LocationMarker setLocation={setUserLocation} location={userLocation} userLocationIcon={userLocationIcon} /> */}

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
                {/* ======== Popup'a offset={[0, -20]} eklendi ======== */}
                <Popup closeButton={false} className="custom-popup" offset={[0, -20]}> 
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

      {/* ======== SABİT ALT BUTONLAR ALANI ======== */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 z-[1000]">
        <Button
          onClick={handleMapAction}
          variant="secondary" 
          className="px-6 py-3 text-lg rounded-full backdrop-blur-md bg-slate-800/70 border border-slate-700 text-white shadow-xl hover:bg-slate-700/80 transition-colors"
        >
          <MapPin size={20} className="mr-2" /> Map 
        </Button>

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