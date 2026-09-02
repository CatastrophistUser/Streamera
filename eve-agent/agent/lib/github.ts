const API = "https://api.github.com";

export function repoConfig() {
  const repo = process.env.STREAMERA_REPO ?? "CatastrophistUser/Streamera";
  const token = process.env.GITHUB_TOKEN;
  const path = process.env.PROVIDERS_PATH ?? "public/providers.json";
  const branch = process.env.STREAMERA_BRANCH ?? "main";
  if (!token) throw new Error("GITHUB_TOKEN is not set");
  return { repo, token, path, branch };
}

export function ghHeaders(token: string) {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "streamera-provider-sentinel",
  };
}

export async function getFile() {
  const { repo, token, path, branch } = repoConfig();
  const res = await fetch(
    `${API}/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`,
    { headers: ghHeaders(token) },
  );
  if (!res.ok) {
    throw new Error(`GitHub GET ${path} failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { content: string; sha: string };
  return {
    sha: json.sha,
    text: Buffer.from(json.content, "base64").toString("utf8"),
  };
}

export async function putFile(text: string, sha: string, message: string) {
  const { repo, token, path, branch } = repoConfig();
  const res = await fetch(`${API}/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: { ...ghHeaders(token), "content-type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(text, "utf8").toString("base64"),
      sha,
      branch,
    }),
  });
  if (!res.ok) {
    throw new Error(`GitHub PUT ${path} failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { commit: { sha: string; html_url: string } };
  return { sha: json.commit.sha, url: json.commit.html_url };
}
