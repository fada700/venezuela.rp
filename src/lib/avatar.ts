/**
 * Returns the Roblox headshot URL for a given roblox user id or username.
 * Falls back to the provided fallback URL if no identifier exists.
 */
export function robloxAvatar(opts: {
  roblox_id?: string | null;
  roblox_nickname?: string | null;
  fallback?: string | null;
  size?: number;
}): string | null {
  const size = opts.size ?? 420;
  if (opts.roblox_id) {
    // Roblox public headshot endpoint (no auth required)
    return `https://www.roblox.com/headshot-thumbnail/image?userId=${opts.roblox_id}&width=${size}&height=${size}&format=png`;
  }
  if (opts.roblox_nickname) {
    // Username-based fallback via Roblox CDN proxy
    return `https://www.roblox.com/headshot-thumbnail/image?username=${encodeURIComponent(opts.roblox_nickname)}&width=${size}&height=${size}&format=png`;
  }
  return opts.fallback ?? null;
}
