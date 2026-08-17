// =============================================================================
// DukaanSync — AuthContext
// =============================================================================
// Listens to Firebase Auth state and fetches the matching UserProfile from
// Firestore. Exposes auth helpers: login, register, logout, resetPassword.
//
// Gracefully handles the case where Firebase is not initialized (e.g. during
// SSR / static prerendering) by staying in a loading state.
// =============================================================================

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { UserProfile } from "@/types";

// -----------------------------------------------------------------------------
// Context shape
// -----------------------------------------------------------------------------

interface AuthContextValue {
  /** Firebase Auth user (null when signed out) */
  user: User | null;
  /** Firestore UserProfile document (null until loaded) */
  userProfile: UserProfile | null;
  /** True while auth state or profile is loading */
  loading: boolean;
  /** Auth error message (cleared on next attempt) */
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<{ user: User; hasBusiness: boolean } | null>;
  register: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  /** Re-fetch the UserProfile from Firestore */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(() => !!auth);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch profile helper
  // ---------------------------------------------------------------------------
  const fetchProfile = useCallback(async (firebaseUser: User) => {
    if (!db) return;
    try {
      const profileRef = doc(db, "users", firebaseUser.uid);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        const data = profileSnap.data();
        let needsUpdate = false;
        
        // Self-heal older accounts that might be missing these fields
        if (!data.email || !data.displayName || !data.createdAt) {
          needsUpdate = true;
          data.email = data.email || firebaseUser.email || "";
          data.displayName = data.displayName || firebaseUser.displayName || "Admin";
          data.createdAt = data.createdAt || firebaseUser.metadata.creationTime || new Date().toISOString();
          
          await updateDoc(profileRef, {
            email: data.email,
            displayName: data.displayName,
            createdAt: data.createdAt,
          });
        }
        
        setUserProfile({ uid: firebaseUser.uid, ...data } as UserProfile);
      } else {
        setUserProfile(null);
      }
    } catch (err) {
      console.error("[AuthContext] Failed to fetch user profile:", err);
      setUserProfile(null);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Auth state listener
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Firebase not initialized (build-time / missing env vars)
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        await fetchProfile(firebaseUser);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [fetchProfile]);

  // ---------------------------------------------------------------------------
  // Auth actions
  // ---------------------------------------------------------------------------
  const login = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(message);
      throw err;
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (!auth || !db) throw new Error("Firebase Auth is not initialized.");
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const googleUser = credential.user;

      const userRef = doc(db, "users", googleUser.uid);
      const userSnap = await getDoc(userRef);

      let hasBusiness = false;

      if (!userSnap.exists()) {
        const now = new Date().toISOString();
        const newProfile: UserProfile = {
          uid: googleUser.uid,
          email: googleUser.email || "",
          displayName: googleUser.displayName || "User",
          businessId: null,
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      } else {
        const data = userSnap.data();
        hasBusiness = !!data?.businessId;
        setUserProfile({ uid: googleUser.uid, ...data } as UserProfile);
      }

      return { user: googleUser, hasBusiness };
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err) {
        const code = (err as { code: string }).code;
        if (
          code === "auth/popup-closed-by-user" ||
          code === "auth/cancelled-popup-request"
        ) {
          return null;
        }
      }
      const message =
        err instanceof Error
          ? err.message
          : "Google sign-in failed. Please try again.";
      setError(message);
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    setError(null);
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      return credential.user;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.";
      setError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    if (!auth) return;
    setError(null);
    await signOut(auth);
    setUserProfile(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Password reset failed. Please try again.";
      setError(message);
      throw err;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  // ---------------------------------------------------------------------------
  // Memoised value
  // ---------------------------------------------------------------------------
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      userProfile,
      loading,
      error,
      login,
      loginWithGoogle,
      register,
      logout,
      resetPassword,
      refreshProfile,
    }),
    [
      user,
      userProfile,
      loading,
      error,
      login,
      loginWithGoogle,
      register,
      logout,
      resetPassword,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
