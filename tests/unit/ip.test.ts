import { describe, expect, it } from "vitest";
import { isPrivateAddress } from "@/lib/net/ip";

describe("isPrivateAddress (SSRF guard for image-link import)", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.10", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "::", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "224.0.0.1"])(
    "blocks %s",
    (ip) => expect(isPrivateAddress(ip)).toBe(true),
  );
  it.each(["8.8.8.8", "151.101.1.69", "172.32.0.1", "2a04:4e42::720", "::ffff:8.8.8.8"])("allows %s", (ip) => expect(isPrivateAddress(ip)).toBe(false));
});
