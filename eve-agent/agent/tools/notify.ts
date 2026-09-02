import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Send a push notification to the site owner via ntfy. Use it when providers changed, or when the site needs manual attention. Do NOT notify on a healthy no-op run.",
  inputSchema: z.object({
    title: z.string().max(80),
    message: z.string().max(1000),
    priority: z.enum(["min", "low", "default", "high", "urgent"]).default("default"),
    tags: z.array(z.string()).max(5).default([]),
  }),
  async execute({ title, message, priority, tags }) {
    const topic = process.env.NTFY_TOPIC;
    if (!topic) throw new Error("NTFY_TOPIC is not set");
    const server = process.env.NTFY_SERVER ?? "https://ntfy.sh";

    const headers: Record<string, string> = { Title: title, Priority: priority };
    if (tags.length) headers.Tags = tags.join(",");
    if (process.env.NTFY_TOKEN) headers.Authorization = `Bearer ${process.env.NTFY_TOKEN}`;

    const res = await fetch(`${server}/${topic}`, {
      method: "POST",
      headers,
      body: message,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`ntfy failed: ${res.status} ${await res.text()}`);
    return { sent: true, topic, priority };
  },
});
