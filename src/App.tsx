import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { StoreProfile, AuthMode } from './types';
import { LandingPage } from './pages/LandingPage';
import { DashboardShell } from './pages/DashboardShell';
import { AdminUsersPanel } from './pages/AdminUsersPanel';
import { AuthModal } from './components/AuthModal';
import { Store, ShieldAlert, ArrowLeft, Loader2, Lock } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<StoreProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Path routing state for /hq-admin
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // HQ Admin verification state
  const [isHQAdmin, setIsHQAdmin] = useState<boolean | null>(null);
  const [hqChecking, setHqChecking] = useState(false);
  const [hqUnauthorizedMsg, setHqUnauthorizedMsg] = useState<string | null>(null);

  // Store modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('signup');

  // HQ modal state (when accessing /hq-admin while logged out)
  const [hqAuthModalOpen, setHqAuthModalOpen] = useState(false);

  // Listen to popstate (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update last_login_at and ensure active owner status in public.store_profiles
  const recordStoreLogin = useCallback(async (user: any) => {
    try {
      const now = new Date().toISOString();
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      // Attempt to update last_login_at and enforce owner access
      const { data, error } = await supabase
        .from('store_profiles')
        .update({
          role: 'owner',
          is_approved: true,
          plan_name: 'Launch Beta (All Modules)',
          subscription_status: 'active',
          last_login_at: now,
          updated_at: now,
        })
        .eq('id', user.id)
        .select('*')
        .maybeSingle();

      if (error) {
        console.warn('[Nivo POS] store_profiles update note:', error.message);
      }

      if (data) {
        setUserProfile(data);
      }
    } catch (err) {
      console.error('[Nivo POS] Error updating last_login_at:', err);
    }
  }, []);

  // Fetch or refresh store profile from public.store_profiles
  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('store_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.warn('[Nivo POS] Error fetching store profile:', error.message);
        }

        if (data) {
          setUserProfile(data);
        } else {
          // If no row exists yet, create one with instant owner access
          const now = new Date().toISOString();
          const nextYear = new Date();
          nextYear.setFullYear(nextYear.getFullYear() + 1);

          const defaultProfile: StoreProfile = {
            id: userId,
            owner_name: currentUser?.user_metadata?.full_name || 'Store Owner',
            store_name: currentUser?.user_metadata?.store_name || 'My Store',
            phone: currentUser?.phone || currentUser?.user_metadata?.phone || '',
            email: currentUser?.email || '',
            city: currentUser?.user_metadata?.city || 'India',
            business_category:
              currentUser?.user_metadata?.business_category || 'Kirana & Grocery',
            role: 'owner',
            is_approved: true,
            plan_name: 'Launch Beta (All Modules)',
            subscription_status: 'active',
            billing_cycle: 'Free Beta',
            next_renewal_date: nextYear.toISOString(),
            last_login_at: now,
            updated_at: now,
          };

          await supabase.from('store_profiles').upsert(defaultProfile);
          setUserProfile(defaultProfile);
        }
      } catch (err) {
        console.error('[Nivo POS] Exception fetching profile:', err);
      }
    },
    [currentUser]
  );

  // Check HQ Admin Authorization: ONLY by checking public.hq_admins (user_id = session.user.id and is_active = true)
  const verifyHQAdminAccess = useCallback(async (user: any) => {
    if (!user) {
      setIsHQAdmin(false);
      return;
    }

    setHqChecking(true);
    setHqUnauthorizedMsg(null);

    try {
      const { data, error } = await supabase
        .from('hq_admins')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.warn('[HQ Gate] hq_admins query note:', error.message);
      }

      if (data && data.is_active === true) {
        setIsHQAdmin(true);
      } else {
        // NOT in hq_admins -> sign out immediately and show "Unauthorized HQ Access"
        console.warn('[HQ Gate] Unauthorized access attempt by UID:', user.id);
        await supabase.auth.signOut();
        setCurrentUser(null);
        setUserProfile(null);
        setIsHQAdmin(false);
        setHqUnauthorizedMsg(
          `Unauthorized HQ Access: Your account (${user.email || user.phone || user.id}) is not registered in public.hq_admins with is_active = true. You have been signed out.`
        );
      }
    } catch (err: any) {
      console.error('[HQ Gate] Exception verifying admin:', err);
      await supabase.auth.signOut();
      setCurrentUser(null);
      setIsHQAdmin(false);
      setHqUnauthorizedMsg('Unauthorized HQ Access: Verification error.');
    } finally {
      setHqChecking(false);
    }
  }, []);

  // Listen to Supabase auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      if (user) {
        recordStoreLogin(user);
        fetchProfile(user.id);
        if (window.location.pathname.startsWith('/hq-admin')) {
          verifyHQAdminAccess(user);
        }
      }
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null;
      setCurrentUser(user);

      if (user) {
        if (event === 'SIGNED_IN') {
          await recordStoreLogin(user);
        }
        await fetchProfile(user.id);

        if (window.location.pathname.startsWith('/hq-admin')) {
          await verifyHQAdminAccess(user);
        }
      } else {
        setUserProfile(null);
        setIsHQAdmin(null);
      }
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, recordStoreLogin, verifyHQAdminAccess]);

  // Handle URL change when on /hq-admin vs /
  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    if (path.startsWith('/hq-admin') && currentUser) {
      verifyHQAdminAccess(currentUser);
    }
  };

  const handleOpenAuth = (mode: AuthMode) => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = async (user: any) => {
    setCurrentUser(user);
    await recordStoreLogin(user);
    await fetchProfile(user.id);

    if (currentPath.startsWith('/hq-admin')) {
      await verifyHQAdminAccess(user);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setUserProfile(null);
      setIsHQAdmin(null);
      setHqUnauthorizedMsg(null);
    } catch (err) {
      console.error('[Nivo POS] Error signing out:', err);
    }
  };

  const handleRefreshProfile = async () => {
    if (currentUser?.id) {
      await fetchProfile(currentUser.id);
    }
  };

  // Loading skeleton while checking session
  if (authLoading || hqChecking) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] shadow-sm animate-pulse">
            <Store className="w-5 h-5 text-[#4338CA]" />
          </div>
          <span className="text-xs font-mono tracking-wider text-slate-500">
            CONNECTING TO NIVOPOS.IN...
          </span>
        </div>
      </div>
    );
  }

  // ================= ROUTE 1: FOUNDER-ONLY HQ COMMAND CENTER (/hq-admin) =================
  if (currentPath.startsWith('/hq-admin')) {
    // 1A. If an unauthorized sign-out just occurred
    if (hqUnauthorizedMsg) {
      return (
        <div className="min-h-screen bg-[#F4F6F9] text-slate-800 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-rose-200 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[#0F172A]">Unauthorized HQ Access</h2>
            <p className="text-xs text-rose-700 leading-relaxed">{hqUnauthorizedMsg}</p>
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setHqUnauthorizedMsg(null);
                  navigateTo('/');
                }}
                className="w-full py-2.5 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-bold border border-[#4338CA] flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to nivopos.in</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 1B. If not logged in on /hq-admin -> Show Founder Login Gate
    if (!currentUser) {
      return (
        <div className="min-h-screen bg-[#F4F6F9] text-slate-800 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] mx-auto shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0F172A]">Nivo POS HQ Command Center</h2>
              <p className="text-xs text-slate-500 mt-1">
                Restricted to authorized founders and HQ operations. Requires verified record in{' '}
                <code className="text-[#4338CA] font-mono bg-slate-50 px-1 py-0.5 rounded border border-slate-200">
                  public.hq_admins
                </code>.
              </p>
            </div>

            <button
              onClick={() => setHqAuthModalOpen(true)}
              className="w-full py-3 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <span>Authenticate as HQ Admin</span>
            </button>

            <div className="pt-2">
              <button
                onClick={() => navigateTo('/')}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                ← Back to public storefront (nivopos.in)
              </button>
            </div>
          </div>

          <AuthModal
            isOpen={hqAuthModalOpen}
            onClose={() => setHqAuthModalOpen(false)}
            initialMode="signin"
            onAuthSuccess={handleAuthSuccess}
          />
        </div>
      );
    }

    // 1C. Logged in and verified in public.hq_admins -> Show Founder Dashboard
    if (isHQAdmin === true) {
      return (
        <AdminUsersPanel
          currentUser={currentUser}
          onSignOut={handleSignOut}
        />
      );
    }

    // Fallback loading / checking
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center text-slate-500 text-xs">
        <Loader2 className="w-5 h-5 animate-spin text-[#4338CA] mr-2" />
        <span>Verifying HQ Admin Credentials...</span>
      </div>
    );
  }

  // ================= ROUTE 2: STORE OWNER APP (ROOT /) =================
  // If store owner is logged in -> Directly into DashboardShell with all 5 modules unlocked!
  if (currentUser) {
    return (
      <DashboardShell
        currentUser={currentUser}
        userProfile={userProfile}
        onSignOut={handleSignOut}
        onRefreshProfile={handleRefreshProfile}
      />
    );
  }

  // If not logged in -> Show astonishing dynamic landing page (ZERO links to /hq-admin)
  return (
    <>
      <LandingPage
        onOpenAuth={handleOpenAuth}
        currentUser={currentUser}
        userProfile={userProfile}
        onSignOut={handleSignOut}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}

export default App;
