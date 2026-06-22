/**
 * Resolves API and static asset URLs to absolute URLs on mobile platforms (Capacitor/Cordova)
 * while keeping relative paths or standard location origins for web deployment.
 */

// Production API URL for fallback on mobile
export const PRODUCTION_API_URL = "https://ripple.zerolord.com";

export function getApiBaseUrl(): string {
  if (typeof window === "undefined") return "";

  const origin = window.location.origin || "";
  const isMobileApp = 
    origin.startsWith("capacitor:") || 
    origin.startsWith("file:") || 
    origin.startsWith("local:") || 
    (origin.startsWith("http://localhost") && !window.location.port) || // pure localhost served without port e.g. on native capacitor
    (navigator.userAgent.toLowerCase().includes("android") && !origin.includes(".run.app") && !origin.includes("3000") && !origin.includes("5173"));

  if (isMobileApp) {
    // If a developer wants to connect their build to a debug backend (e.g., local dev or AI Studio Dev App URL), 
    // they can specify it in localStorage. Example: localStorage.setItem('ripple_custom_api_url', 'https://ais-dev...')
    const customUrl = localStorage.getItem("ripple_custom_api_url");
    if (customUrl) return customUrl;
    
    return PRODUCTION_API_URL;
  }

  // Otherwise, default to standard relative URL resolving to the current hosted host (e.g. AI Studio development and production servers)
  return "";
}

/**
 * Resolves any target path to either a relative URL (web) or fully-qualified absolute URL (mobile APK)
 */
export function resolveUrl(path: string): string {
  if (!path) return "";
  if (
    path.startsWith("http://") || 
    path.startsWith("https://") || 
    path.startsWith("data:") || 
    path.startsWith("blob:") ||
    path.startsWith("capacitor:")
  ) {
    return path;
  }
  
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
