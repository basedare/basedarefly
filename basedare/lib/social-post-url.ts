/** Public post addresses only. Never resolve short links, scrape, fetch or accept embed HTML. */
export type PublicSocialPost = {
  platform: "TIKTOK" | "INSTAGRAM" | "X";
  url: string;
};
export function publicSocialPost(input: unknown): PublicSocialPost | null {
  if (typeof input !== "string" || input.length > 1024) return null;
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (
      host === "tiktok.com" &&
      /^\/@[a-zA-Z0-9._-]{1,32}\/video\/\d{10,25}\/?$/.test(url.pathname)
    )
      return {
        platform: "TIKTOK",
        url: "https://www.tiktok.com" + url.pathname.replace(/\/$/, ""),
      };
    const instagram = /^\/(p|reel|reels)\/([a-zA-Z0-9_-]{5,40})\/?$/.exec(
      url.pathname,
    );
    if (host === "instagram.com" && instagram)
      return {
        platform: "INSTAGRAM",
        url: `https://www.instagram.com/${instagram[1] === "p" ? "p" : "reel"}/${instagram[2]}/`,
      };
    const x = /^\/([a-zA-Z0-9_]{1,15})\/status\/(\d{5,25})\/?$/.exec(
      url.pathname,
    );
    if ((host === "x.com" || host === "twitter.com") && x)
      return {
        platform: "X",
        url: `https://x.com/${x[1].toLowerCase()}/status/${x[2]}`,
      };
    return null;
  } catch {
    return null;
  }
}

/** Post IDs, rather than editable author handles or tracking queries, define duplicates. */
export function socialPostIdentity(post: PublicSocialPost) {
  const parts = new URL(post.url).pathname.split("/").filter(Boolean);
  return (
    post.platform +
    ":" +
    (post.platform === "INSTAGRAM" ? parts[1] : parts.at(-1))
  );
}
