import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isPrivateAddress } from "@/lib/net/ip";
import { env } from "@/lib/env";
import { AppError } from "../errors";
import { MAX_UPLOAD_BYTES } from "./uploads";

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;

const fail = (message: string) => new AppError("VALIDATION", message, { coverUrl: [message] });

async function assertPublicUrl(url: URL) {
  const allowPrivate = env.IMAGE_IMPORT_ALLOW_PRIVATE;
  if (url.protocol !== "https:" && !(allowPrivate && url.protocol === "http:")) throw fail("Use an https:// image link.");
  if (url.username || url.password) throw fail("Links with passwords aren't allowed.");
  if (allowPrivate) return;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (addresses.length === 0) throw fail("We couldn't reach that website.");
  if (addresses.some(isPrivateAddress)) throw fail("That link points to a private network address.");
}

/**
 * Downloads an image from a user-supplied URL so it can be stored like an upload.
 * SSRF guards: https only, public IPs only (re-checked on every redirect), no credentials,
 * 10 s timeout, 5 MB cap while streaming. The caller still validates magic bytes.
 */
export async function fetchRemoteImage(rawUrl: string): Promise<File> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw fail("That doesn't look like a valid link.");
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url);
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8", "User-Agent": "MyTripImageFetcher/1.0 (+https://mytrip.app)" },
      });
    } catch {
      throw fail("We couldn't download that image. Check the link or upload the photo instead.");
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      url = new URL(location, url);
      continue;
    }
    if (!res.ok || !res.body) throw fail(`The image link returned an error (${res.status}).`);
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_UPLOAD_BYTES) throw fail("That image is bigger than 5 MB.");

    const reader = res.body.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_UPLOAD_BYTES) {
        await reader.cancel();
        throw fail("That image is bigger than 5 MB.");
      }
      chunks.push(new Uint8Array(value));
    }
    const type = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "application/octet-stream";
    return new File(chunks, "cover", { type });
  }
  throw fail("That link redirects too many times.");
}
