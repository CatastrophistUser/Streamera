import { defineTool } from "eve/tools";
import { z } from "zod";
import { getFile } from "#lib/github.js";
import { configSchema } from "#lib/providers.js";

export default defineTool({
  description:
    "Read the current playback provider list from public/providers.json in the Streamera repo. Returns every provider plus the git blob sha needed to write the file back.",
  inputSchema: z.object({}),
  async execute() {
    const { text, sha } = await getFile();
    const config = configSchema.parse(JSON.parse(text));
    return {
      sha,
      version: config.version,
      count: config.providers.length,
      providers: config.providers,
    };
  },
});
