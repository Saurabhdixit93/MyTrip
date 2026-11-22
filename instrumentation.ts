/** Runs once per server start (Node runtime) before any request is handled. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.DNS_FALLBACK_SERVERS) {
    const { dnsFallbackFromEnv } = await import("./server/net/dns-fallback");
    dnsFallbackFromEnv(process.env.DNS_FALLBACK_SERVERS);
  }
}
