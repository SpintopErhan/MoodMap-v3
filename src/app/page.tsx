// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const router = useRouter();
  const [loadingInitialCheck, setLoadingInitialCheck] = useState(true);
  const [isFarcasterMiniApp, setIsFarcasterMiniApp] = useState(false);
  const [farcasterUser, setFarcasterUser] = useState<{ fid: number; username: string; display_name: string; pfp_url: string } | null>(null);

  useEffect(() => {
  // Farcaster Mini App ortamında mıyız kontrol et
  const farcaster = (window as any).farcaster;

  if (farcaster?.getUser) {
    setIsFarcasterMiniApp(true);

    const getUserInfo = async () => {
      try {
        const user = await farcaster.getUser();
        if (user) {
          setFarcasterUser(user);
        } else {
          setFarcasterUser(null);
        }
      } catch (error) {
        console.error("Farcaster user info fetching error:", error);
        setFarcasterUser(null);
      } finally {
        setLoadingInitialCheck(false);
      }
    };

    getUserInfo();
  } else {
    setIsFarcasterMiniApp(false);
    setLoadingInitialCheck(false);
  }
}, []);
  useEffect(() => {
    if (!loadingInitialCheck && isFarcasterMiniApp && farcasterUser) {
      const checkExistingMoodAndRedirect = async () => {
        try {
          const { data } = await supabase
            .from("moods")
            .select("id") 
            .eq("fid", farcasterUser.fid) 
            .limit(1);

          if (data && data.length > 0) {
            router.replace("/map"); 
          } else {
            setLoadingInitialCheck(false);
          }
        } catch (e: any) {
          console.error("Error during mood check:", e); 
          setLoadingInitialCheck(false);
        }
      };
      checkExistingMoodAndRedirect();
    }
  }, [loadingInitialCheck, isFarcasterMiniApp, farcasterUser, router]);

  if (loadingInitialCheck) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] flex flex-col items-center justify-center p-8 text-white">
        <Loader2 className="animate-spin text-purple-400 w-16 h-16 mb-4" />
        <p className="text-xl text-center">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] flex flex-col items-center justify-center p-8 text-white">
      {!isFarcasterMiniApp ? (
        <>
          <h1 className="text-4xl font-bold text-purple-400 mb-4">MoodMap (Web)</h1>
          <p className="text-xl text-center mb-8">
            This app is designed to run as a Farcaster Mini App.
          </p>
          <p className="text-lg text-center text-gray-400">
            Please open this URL in a Farcaster client (e.g., Warpcast) to experience the full app.
          </p>
        </>
      ) : (
        <>
          {!farcasterUser ? (
            <>
              <h2 className="text-3xl font-bold text-purple-400 mb-4">Farcaster Hesabı Bulunamadı</h2>
              <p className="text-lg text-center mb-8">
                Lütfen Farcaster uygulamanızda oturum açtığınızdan veya bir Farcaster hesabına sahip olduğunuzdan emin olun.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                Hello {farcasterUser.username}! Ready to share your first mood?
              </h2>
              <p className="text-lg text-center text-gray-300 mb-6">
                You haven't shared a mood yet. Click "Share My Mood" to add it to the map.
              </p>
              <button
                onClick={() => router.push("/map")} 
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-10 py-5 rounded-full font-bold text-xl shadow-2xl transition-all"
              >
                Share My Mood 🚀
              </button>
              <p className="text-sm text-gray-500 mt-4">Don't forget to allow location permissions!</p>
            </>
          )}
        </>
      )}
    </div>
  );
}