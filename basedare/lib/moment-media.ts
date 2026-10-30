import "server-only";
import { PinataSDK } from "pinata";
import { ADVENTURE_MEDIA_LIMIT } from "./adventure-sharing";
import { validateSupportedMediaFile } from "./media-upload";

const TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
};
function storage() {
  if (!process.env.PINATA_JWT) throw new Error("PRIVATE_STORAGE_UNAVAILABLE");
  return new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
    pinataGateway:
      process.env.PINATA_GATEWAY || "purple-void-gateway.pinata.cloud",
  });
}
export async function validateMomentFile(file: File) {
  if (
    file.size > ADVENTURE_MEDIA_LIMIT ||
    !TYPES[file.type] ||
    validateSupportedMediaFile(file)
  )
    return "Choose a JPG, PNG, GIF, MP4, MOV or WebM under 4 MB.";
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const text = (a: number, n: number) =>
    String.fromCharCode(...b.slice(a, a + n));
  const valid =
    file.type === "image/jpeg"
      ? b[0] === 255 && b[1] === 216 && b[2] === 255
      : file.type === "image/png"
        ? [...b.slice(0, 8)].join(",") === "137,80,78,71,13,10,26,10"
        : file.type === "image/gif"
          ? ["GIF87a", "GIF89a"].includes(text(0, 6))
          : file.type === "video/webm"
            ? [...b.slice(0, 4)].join(",") === "26,69,223,163"
            : text(4, 4) === "ftyp";
  return valid
    ? null
    : "The file contents don’t match its media type. Choose the original photo or video.";
}
export async function uploadPrivateMoment(file: File) {
  const invalid = await validateMomentFile(file);
  if (invalid) throw new Error(invalid);
  const safeFile = new File(
    [await file.arrayBuffer()],
    "basedare-moment" + TYPES[file.type],
    { type: file.type },
  );
  const upload = await storage()
    .upload.private.file(safeFile)
    .name("BaseDare_Moment");
  if (!/^[a-zA-Z0-9]{40,120}$/.test(upload.cid))
    throw new Error("PRIVATE_STORAGE_UNAVAILABLE");
  return {
    cid: upload.cid,
    mime: file.type,
    mediaType: file.type.startsWith("image/") ? "IMAGE" : "VIDEO",
  };
}
export async function privateMomentResponse(
  cid: string,
  mime: string,
  range: string | null,
) {
  if (!/^[a-zA-Z0-9]{40,120}$/.test(cid) || !TYPES[mime])
    throw new Error("PRIVATE_STORAGE_UNAVAILABLE");
  const link = new URL(
    await storage().gateways.private.createAccessLink({ cid, expires: 30 }),
  );
  const gateway =
    process.env.PINATA_GATEWAY || "purple-void-gateway.pinata.cloud";
  if (
    link.protocol !== "https:" ||
    link.hostname !== gateway ||
    link.username ||
    link.password ||
    link.port
  )
    throw new Error("PRIVATE_STORAGE_UNAVAILABLE");
  const validRange =
    range && /^bytes=\d{1,10}-\d{0,10}$/.test(range) ? range : null;
  const upstream = await fetch(link, {
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
    headers: validRange ? { Range: validRange } : {},
  });
  if (![200, 206].includes(upstream.status))
    throw new Error("PRIVATE_STORAGE_UNAVAILABLE");
  const headers = new Headers({
    "Content-Type": mime,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Content-Disposition": `inline; filename="basedare-moment${TYPES[mime]}"`,
  });
  const contentRange = upstream.headers.get("content-range");
  if (
    upstream.status === 206 &&
    contentRange &&
    /^bytes \d+-\d+\/\d+$/.test(contentRange)
  ) {
    headers.set("Content-Range", contentRange);
    headers.set("Accept-Ranges", "bytes");
  }
  const { boundedRequestBytes } = await import("./bounded-request");
  const bytes = await boundedRequestBytes(
    new Request("https://media.invalid", {
      method: "POST",
      body: upstream.body,
      duplex: "half",
    } as RequestInit),
    ADVENTURE_MEDIA_LIMIT,
  );
  return new Response(bytes, { status: upstream.status, headers });
}
