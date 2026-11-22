import dns, { type LookupAddress } from "node:dns";

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

const RETRYABLE = new Set(["ENOTFOUND", "EAI_AGAIN", "ESERVFAIL", "EREFUSED", "ECONNREFUSED"]);
let installed = false;

/**
 * Some ISP/router resolvers refuse or drop newer hostnames (e.g. *.neon.tech), which breaks both
 * Postgres (pg → net.connect) and S3 storage (fetch). When enabled, a failed system lookup is
 * retried against public resolvers. TLS still uses the original hostname, so certificates/SNI
 * are unaffected. Opt-in via DNS_FALLBACK_SERVERS (e.g. "1.1.1.1,8.8.8.8").
 */
export function installDnsFallback(servers: string[]) {
  if (installed || servers.length === 0) return;
  installed = true;
  const original = dns.lookup.bind(dns);
  const resolver = new dns.promises.Resolver({ timeout: 3000, tries: 2 });
  resolver.setServers(servers);

  // Hosts the system resolver failed on: skip it (and its timeout) for a while and reuse answers.
  const TTL_MS = 5 * 60_000;
  const cache = new Map<string, { list: LookupAddress[]; expires: number }>();

  async function resolvePublic(hostname: string, family: number | undefined): Promise<LookupAddress[]> {
    const hit = cache.get(hostname);
    if (hit && hit.expires > Date.now()) return hit.list;
    const list = await resolveFresh(hostname, family);
    if (list.length) cache.set(hostname, { list, expires: Date.now() + TTL_MS });
    return list;
  }

  async function resolveFresh(hostname: string, family: number | undefined): Promise<LookupAddress[]> {
    const v4 = family === 6 ? [] : await resolver.resolve4(hostname).catch(() => []);
    const v6 = family === 4 || v4.length ? [] : await resolver.resolve6(hostname).catch(() => []);
    return [...v4.map((address) => ({ address, family: 4 })), ...v6.map((address) => ({ address, family: 6 }))];
  }

  function lookup(hostname: string, options: dns.LookupOptions | number | LookupCallback | undefined, maybeCallback?: LookupCallback) {
    const callback = typeof options === "function" ? options : maybeCallback;
    if (!callback) return;
    const opts: dns.LookupOptions = typeof options === "number" ? { family: options } : typeof options === "object" ? { ...options } : {};
    const respond = (list: LookupAddress[], err: NodeJS.ErrnoException) => {
      const first = list[0];
      if (!first) return callback(err, "", 0);
      return opts.all ? callback(null, list) : callback(null, first.address, first.family);
    };
    const cached = cache.get(hostname);
    if (cached && cached.expires > Date.now()) return respond(cached.list, new Error("unreachable"));

    original(hostname, { ...opts, all: true }, (err, addresses) => {
      if (!err) {
        if (opts.all) return callback(null, addresses);
        const first = addresses[0];
        return first ? callback(null, first.address, first.family) : callback(err, "", 0);
      }
      if (!err.code || !RETRYABLE.has(err.code)) return callback(err, "", 0);
      const family = typeof opts.family === "number" ? opts.family : undefined;
      void resolvePublic(hostname, family).then((list) => respond(list, err));
    });
  }

  Object.defineProperty(dns, "lookup", { configurable: true, writable: true, value: lookup });
}

export function dnsFallbackFromEnv(value: string | undefined) {
  const servers = (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  installDnsFallback(servers);
}
