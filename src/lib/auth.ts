import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

let authSubscription: { unsubscribe: () => void } | null = null;
let isSigningOut = false;
let signOutTimeout: NodeJS.Timeout | null = null;

// Cookie helper functions
const COOKIE_NAME = 'sb_access_token';

function setAccessTokenCookie(token: string | null) {
  if (token) {
    document.cookie = `${COOKIE_NAME}=${token};path=/;max-age=3600`;
  } else {
    document.cookie = `${COOKIE_NAME}=;path=/;max-age=0`;
  }
}

function getAccessTokenCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${COOKIE_NAME}=([^;]+)`));
  return match ? match[2] : null;
}

export async function handleAuthStateChange(callback: (user: User | null) => void) {
  try {
    // Clean up any existing subscription and timeout
    cleanup();

    // Initial session check
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    if (session?.user && !isSigningOut) {
      // Set initial access token cookie
      setAccessTokenCookie(session.access_token);
      await ensureUserProfile(session.user);
      callback(session.user);
    } else {
      callback(null);
    }

    // Listen for auth changes
    const { data: { subscription }, error: subscriptionError } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      
      const currentAccessToken = getAccessTokenCookie();
      const newAccessToken = session?.access_token;

      // Only process if the access token has actually changed
      if (currentAccessToken !== newAccessToken) {
        console.log('Session token changed, updating state...');
        
        if (event === 'SIGNED_IN' && session?.user) {
          setAccessTokenCookie(newAccessToken);
          await ensureUserProfile(session.user);
          callback(session.user);
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          setAccessTokenCookie(null);
          callback(null);
          // Force cleanup after sign out
          cleanup();
        }
      } else {
        console.log('Session token unchanged, skipping update');
      }
    });

    if (subscriptionError) throw subscriptionError;
    
    authSubscription = subscription;
    return subscription;
  } catch (error) {
    console.error('Error in handleAuthStateChange:', error);
    callback(null);
    throw error;
  }
}

function cleanup() {
  if (authSubscription) {
    console.log('Cleaning up auth subscription');
    try {
      authSubscription.unsubscribe();
    } catch (e) {
      console.warn('Error unsubscribing:', e);
    }
    authSubscription = null;
  }

  if (signOutTimeout) {
    clearTimeout(signOutTimeout);
    signOutTimeout = null;
  }

  // Reset sign out flag
  isSigningOut = false;
}

async function ensureUserProfile(user: User) {
  if (isSigningOut) return;
  
  try {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (fetchError || !profile) {
      console.log('Creating new profile for user:', user.id);
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email
        });

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        throw insertError;
      }
    }
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    throw error;
  }
}

export async function signOut() {
  if (isSigningOut) {
    console.log('Sign out already in progress...');
    return;
  }

  console.log('Starting sign out process...');
  isSigningOut = true;

  try {
    // Set a timeout to force sign out completion
    signOutTimeout = setTimeout(() => {
      console.log('Force completing sign out...');
      cleanup();
      window.location.href = '/';
    }, 3000); // Force complete after 3 seconds

    // Clear storage and cookies
    try {
      localStorage.removeItem('sb-' + import.meta.env.VITE_SUPABASE_URL + '-auth-token');
      sessionStorage.clear();
      setAccessTokenCookie(null);
    } catch (e) {
      console.warn('Error clearing storage:', e);
    }

    // Perform Supabase sign out
    const { error } = await supabase.auth.signOut({
      scope: 'global'
    });
    
    if (error) throw error;
    
    console.log('Sign out completed successfully');
    
    // Clean up and redirect
    cleanup();
    window.location.href = '/';
  } catch (error) {
    console.error('Error during sign out:', error);
    // Ensure we still clean up even on error
    cleanup();
    window.location.href = '/';
  }
}