import "server-only";
import { AwsClient } from "aws4fetch";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

export interface StoredObject {
  body: Uint8Array;
  contentType: string;
}

interface StorageDriver {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

/** Dev-only driver: files on local disk next to a tiny content-type sidecar. */
const localDriver: StorageDriver = {
  async put(key, body, contentType) {
    const file = safeLocalPath(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    await writeFile(`${file}.type`, contentType);
  },
  async get(key) {
    const file = safeLocalPath(key);
    try {
      const [body, contentType] = await Promise.all([readFile(file), readFile(`${file}.type`, "utf8")]);
      return { body: new Uint8Array(body), contentType };
    } catch {
      return null;
    }
  },
  async delete(key) {
    const file = safeLocalPath(key);
    await rm(file, { force: true });
    await rm(`${file}.type`, { force: true });
  },
};

function safeLocalPath(key: string) {
  const file = path.resolve(LOCAL_ROOT, key);
  if (!file.startsWith(LOCAL_ROOT + path.sep)) throw new Error("Invalid storage key");
  return file;
}

/**
 * S3-compatible driver (AWS S3, Neon storage, Cloudflare R2, Supabase, MinIO), SigV4-signed,
 * path-style URLs (<endpoint>/<bucket>/<key>), i.e. the SDK's `forcePathStyle: true`.
 */
function s3Driver(): StorageDriver {
  const client = new AwsClient({
    accessKeyId: env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? "",
    region: env.AWS_REGION,
    service: "s3",
  });
  const url = (key: string) => `${env.AWS_ENDPOINT_URL_S3?.replace(/\/$/, "")}/${env.S3_BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;
  return {
    async put(key, body, contentType) {
      const res = await client.fetch(url(key), { method: "PUT", body: new Blob([new Uint8Array(body)]), headers: { "Content-Type": contentType } });
      if (!res.ok) throw new Error(`S3 PUT failed: ${res.status}`);
    },
    async get(key) {
      const res = await client.fetch(url(key));
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`S3 GET failed: ${res.status}`);
      return { body: new Uint8Array(await res.arrayBuffer()), contentType: res.headers.get("content-type") ?? "application/octet-stream" };
    },
    async delete(key) {
      await client.fetch(url(key), { method: "DELETE" });
    },
  };
}

export const storage: StorageDriver = env.STORAGE_DRIVER === "s3" ? s3Driver() : localDriver;
