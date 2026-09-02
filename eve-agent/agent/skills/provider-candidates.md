---
name: provider-candidates
description: The approved list of replacement embed hosts and their URL template shapes. Load when a provider has failed its health check and needs replacing.
---

# Approved replacement candidates

> **Status: unverified.** This list has not been confirmed from a representative
> network. When it was written, DNS for several entries failed from the authoring
> environment, which blocks these domains at the resolver. That is not evidence
> the hosts are dead. Always `check_provider` a candidate before adding it, and
> never add one that did not pass from *your* vantage point.

Only hosts on this list may be added to `providers.json`. Each entry gives the
URL template shape to use. Test both `movie` and `tv` with `check_provider`
before adding.

| host | movie template | tv template |
|---|---|---|
| `vidsrc.xyz` | `https://{host}/embed/movie/{id}` | `https://{host}/embed/tv/{id}/{season}/{episode}` |
| `vidsrc.to` | `https://{host}/embed/movie/{id}` | `https://{host}/embed/tv/{id}/{season}/{episode}` |
| `vidsrc.net` | `https://{host}/embed/movie/{id}` | `https://{host}/embed/tv/{id}/{season}/{episode}` |
| `vidsrc.cc` | `https://{host}/v2/embed/movie/{id}` | `https://{host}/v2/embed/tv/{id}/{season}/{episode}` |
| `embed.su` | `https://{host}/embed/movie/{id}` | `https://{host}/embed/tv/{id}/{season}/{episode}` |
| `moviesapi.club` | `https://{host}/movie/{id}` | `https://{host}/tv/{id}-{season}-{episode}` |
| `2embed.cc` | `https://{host}/embed/{id}` | `https://{host}/embedtv/{id}&s={season}&e={episode}` |
| `autoembed.co` | `https://player.{host}/embed/movie/{id}` | `https://player.{host}/embed/tv/{id}/{season}/{episode}` |

## Choosing a label and id

- `id`: lowercase kebab-case, derived from the host (`vidsrc.cc` → `vidsrc-cc`).
  It must be unique and must not collide with an existing entry.
- `label`: short, 1-2 words, title case. It is a button caption, so keep it
  under 12 characters. Reusing the dead provider's label is fine and keeps the
  UI stable.

## Adding a host that is not on this list

Don't. If every candidate here fails, notify that manual attention is needed and
change nothing. A human decides what new host is trustworthy enough to embed.
