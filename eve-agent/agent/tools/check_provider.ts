import { defineTool } from "eve/tools";
import { z } from "zod";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const DEAD_MARKERS = [
  "domain is for sale",
  "buy this domain",
  "this domain has expired",
  "domain parking",
  "parked free",
  "sedoparking",
  "related searches",
  "404 not found",
  "page not found",
];

const PLAYER_MARKERS = ["<video", "jwplayer", "videojs", "playerjs", "hls", "m3u8", "<iframe", "player"];

export default defineTool({
  description:
    "Probe one embed URL and return evidence about whether it is usable: HTTP status, redirects, whether it can be embedded in an iframe, and heuristic signals about parked or placeholder pages. This returns EVIDENCE, not a verdict - decide for yourself. Note these hosts often block datacenter IPs, so a single failure is weaker evidence than it looks.",
  inputSchema: z.object({
    url: z.string().url().describe("A fully-formed embed URL with placeholders already substituted"),
  }),
  async execute({ url }) {
    const started = Date.now();
    const signals: string[] = [];

    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
        headers: {
          "user-agent": BROWSER_UA,
          accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
        },
      });
    } catch (err) {
      return {
        url,
        reachable: false,
        error: err instanceof Error ? err.message : String(err),
        elapsedMs: Date.now() - started,
        signals: ["request failed - DNS failure, TLS error, or timeout"],
        embeddable: false,
      };
    }

    const body = await res.text().catch(() => "");
    const lower = body.toLowerCase();
    const elapsedMs = Date.now() - started;

    const xfo = res.headers.get("x-frame-options")?.toLowerCase() ?? null;
    const csp = res.headers.get("content-security-policy") ?? null;
    const frameAncestors = csp?.match(/frame-ancestors([^;]*)/i)?.[1]?.trim() ?? null;

    let embeddable = true;
    if (xfo === "deny" || xfo === "sameorigin") {
      embeddable = false;
      signals.push(`x-frame-options: ${xfo} blocks iframe embedding`);
    }
    if (frameAncestors && !frameAncestors.includes("*")) {
      embeddable = false;
      signals.push(`csp frame-ancestors "${frameAncestors}" blocks iframe embedding`);
    }

    if (!res.ok) signals.push(`http ${res.status}`);
    if (res.redirected) signals.push(`redirected to ${res.url}`);
    if (body.length < 500) signals.push(`suspiciously small body (${body.length} bytes)`);

    const dead = DEAD_MARKERS.filter((m) => lower.includes(m));
    if (dead.length) signals.push(`parked/placeholder markers: ${dead.join(", ")}`);

    const player = PLAYER_MARKERS.filter((m) => lower.includes(m));
    if (player.length) signals.push(`player markers present: ${player.join(", ")}`);
    else signals.push("no player markers found in body");

    return {
      url,
      reachable: true,
      status: res.status,
      ok: res.ok,
      redirected: res.redirected,
      finalUrl: res.url,
      contentType: res.headers.get("content-type"),
      bytes: body.length,
      embeddable,
      elapsedMs,
      signals,
    };
  },
});
