// ============================================
// ADD THIS TO YOUR main.ts
// ============================================

import { supabase, signInWithGoogle, signOut } from './supabaseClient';

// ============================================
// 1. Init auth — call this during app startup
// ============================================
function initAuth() {
  // Listen for sign-in / sign-out
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔑 Auth event:', event);

    if (event === 'SIGNED_IN' && session?.user) {
      const user = session.user;
      console.log('✅ Signed in:', user.email);
      console.log('👤 Name:', user.user_metadata?.full_name);
      console.log('🖼️ Avatar:', user.user_metadata?.avatar_url);

      // TODO: Update your UI here
      // Example:
      // document.getElementById('login-btn').style.display = 'none';
      // document.getElementById('user-name').textContent = user.user_metadata?.full_name;
    }

    if (event === 'SIGNED_OUT') {
      console.log('👋 Signed out');
      // TODO: Update your UI here
    }
  });

  // Check if already signed in (restore session)
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      console.log('🔄 Session restored:', session.user.email);
    }
  });
}

// ============================================
// 2. Wire up your login button
// ============================================
// <button id="google-login-btn">Sign in with Google</button>
// <button id="logout-btn" style="display:none">Sign out</button>

document.getElementById('google-login-btn')?.addEventListener('click', signInWithGoogle);
document.getElementById('logout-btn')?.addEventListener('click', signOut);

// ============================================
// 3. Call initAuth() during startup
// ============================================
initAuth();
