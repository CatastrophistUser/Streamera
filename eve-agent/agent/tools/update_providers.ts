import { defineTool } from "eve/tools";
import { z } from "zod";
import { getFile, putFile } from "#lib/github.js";
import { providerSchema, validateConfig } from "#lib/providers.js";

export default defineTool({
  description:
    "Write a new provider list to public/providers.json and commit it directly to main. Pass the COMPLETE list you want the file to contain, not just the changes. The write is rejected if the list fails validation, so a malformed edit cannot reach production. Also refuses a no-op write and refuses to remove every provider.",
  inputSchema: z.object({
    providers: z.array(providerSchema).min(1).max(24),
    reason: z
      .string()
      .min(10)
      .max(200)
      .describe("Short commit-message summary of what changed and why, e.g. 'vidsrcme.ru unreachable, replaced with vidsrc.xyz'"),
  }),
  async execute({ providers, reason }) {
    const config = { version: 1 as const, providers };

    const errors = validateConfig(config);
    if (errors.length) {
      return { written: false, rejected: true, errors };
    }

    const { text: currentText, sha } = await getFile();
    const next = `${JSON.stringify(config, null, 2)}\n`;

    if (JSON.stringify(JSON.parse(currentText)) === JSON.stringify(config)) {
      return { written: false, rejected: false, reason: "no change - the list is already exactly this" };
    }

    const before = JSON.parse(currentText) as { providers: { id: string; host: string }[] };
    const beforeIds = before.providers.map((p) => p.id);
    const afterIds = providers.map((p) => p.id);

    const commit = await putFile(
      next,
      sha,
      `chore(providers): ${reason}\n\nAutomated by the Streamera provider sentinel.`,
    );

    return {
      written: true,
      commit: commit.sha.slice(0, 7),
      url: commit.url,
      removed: beforeIds.filter((id) => !afterIds.includes(id)),
      added: afterIds.filter((id) => !beforeIds.includes(id)),
      total: providers.length,
    };
  },
});
