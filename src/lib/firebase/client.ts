// =============================================================================
// DukaanSync — Firebase Client Re-exports
// =============================================================================
// Barrel file for consuming Firebase services throughout the app.
// The singleton initialization lives in config.ts; this file provides a clean
// import surface:  import { auth, db } from "@/lib/firebase/client";
// =============================================================================

export { app, auth, db } from "./config";
