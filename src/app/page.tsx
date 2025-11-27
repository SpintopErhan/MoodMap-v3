// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
// import { Toaster } from 'react-hot-toast'; // Eğer layout.tsx içinde yoksa bu satırı ve <Toaster /> bileşenini aktif edin

// Supabase client created with anonymous key.
// No special session is needed for database operations, as RLS policies are public.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const router = useRouter();
  const { ready, authenticated, user, login } = usePrivy();
  const [loadingInitialCheck, setLoadingInitialCheck] = useState(true); // Loading state for initial check
  
  const fid = user?.farcaster?.fid; // Farcaster ID (number | undefined)
  //const userName = user?.farcaster?.username; // YENİ: Farcaster kullanıcı adı (string | undefined)
  const privyUserId = user?.id; // Privy's DID (string | undefined) - Only available if authenticated in Privy

  // Main useEffect for mood check and redirection
  useEffect(() => {
    // If Privy is not ready or user is not authenticated, we wait.
    if (!ready || !authenticated) {
      setLoadingInitialCheck(false); // If ready and unauthenticated, loading is done
      return;
    }

    // If authenticated in Privy but Farcaster FID is missing,
    // we'll need to prompt the user to connect Farcaster.
    // In this case, we don't perform a mood check.
    if (authenticated && fid === undefined) {
      setLoadingInitialCheck(false);
      return;
    }

    // If Farcaster FID is available, start the mood check
    if (authenticated && fid !== undefined) {
      const checkExistingMoodAndRedirect = async () => {
        setLoadingInitialCheck(true); // Activate loading state while checking
        try {
          // Check for existing mood using FID
          const { data } = await supabase
            .from("moods")
            .select("id") // Only fetch ID, no need for full data
            .eq("fid", fid) // Search for mood by FID
            .limit(1);

          // If the user has an existing mood, redirect to the map
          if (data && data.length > 0) {
            router.replace("/map"); // replace to not add to browser history
          } else {
            // If no mood exists, continue to show the initial mood entry UI on the home page
            setLoadingInitialCheck(false);
          }
        } catch (e: any) {
          // On error, loading is done and stay on the home page
          console.error("Error during mood check:", e); 
          setLoadingInitialCheck(false);
        }
      };
      checkExistingMoodAndRedirect();
    }
  }, [ready, authenticated, fid, router]); // Dependency array updated

  // Loading screen
  // Show if Privy is not ready, or if the initial check is ongoing.
  // Or if Privy is ready and authenticated but PrivyUserId (needed for Farcaster ID) is not yet available.
  if (!ready || loadingInitialCheck || (authenticated && fid === undefined && privyUserId === undefined)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] flex flex-col items-center justify-center p-8 text-white">
        <Loader2 className="animate-spin text-purple-400 w-16 h-16 mb-4" />
        <p className="text-xl text-center">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] flex flex-col items-center justify-center p-8 text-white">
      {/* For toast notifications, uncomment <Toaster /> if not provided in layout.tsx */}
      {/* <Toaster position="bottom-center" /> */}

      {/* Login screen (if Privy is ready but not authenticated) */}
      {ready && !authenticated && (
        <>
          <h1 className="text-4xl font-bold text-purple-400 mb-4">MoodMap</h1>
          <p className="text-xl text-center mb-8">Please log in with Farcaster to share your mood and see the map.</p>
          <button onClick={login} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-4 rounded-full text-xl font-bold shadow-2xl transition-all">
            Log in with Farcaster
          </button>
        </>
      )}

      {/* Farcaster account not connected screen (if authenticated in Privy but Farcaster FID is missing) */}
      {ready && authenticated && fid === undefined && (
        <>
            <h2 className="text-3xl font-bold text-purple-400 mb-4">Farcaster Account Not Connected</h2>
            <p className="text-lg text-center mb-8">You need a Farcaster account to share your mood. Please log in with Farcaster again or connect Farcaster to your existing Privy account.</p>
            <button onClick={login} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-4 rounded-full text-xl font-bold shadow-2xl transition-all">
                Log in with Farcaster Again
            </button>
        </>
      )}
      
      {/* Initial mood entry screen (if authenticated in Privy, Farcaster FID is present, no mood exists, and check is complete) */}
      {ready && authenticated && fid !== undefined && !loadingInitialCheck && (
        <>
          <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            Hello! Ready to share your first mood?
          </h2>
          <p className="text-lg text-center text-gray-300 mb-6">
            You haven't shared a mood yet. Click "Share My Mood" to add it to the map.
          </p>
          <button
            onClick={() => router.push("/map")} // Redirect to map page, MoodUpdateOverlay will open there
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-10 py-5 rounded-full font-bold text-xl shadow-2xl transition-all"
          >
            Share My Mood 🚀
          </button>
          <p className="text-sm text-gray-500 mt-4">Don't forget to allow location permissions!</p>
        </>
      )}
    </div>
  );
}