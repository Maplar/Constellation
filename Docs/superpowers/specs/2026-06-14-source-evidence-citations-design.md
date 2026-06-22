# Source Evidence Citations Design

## Scope

This design defines how Constellation represents local, URL, and AI-origin citations across the editor, expanded source previews, the knowledge graph, and source-loss recovery.

The current phase remains documentation and static UI calibration only. It does not implement the runtime frontend or Rust services.

## Goals

- Give local, URL, and AI source collections stable rainbow colors across capsules, connectors, preview frames, and graph nodes.
- Support citations to text, images, video, audio, PDF regions, webpages, and mixed media without creating unrelated component families.
- Preserve the minimum evidence needed to understand what was cited if an external source later changes or disappears.
- Use AI to check whether a citation corresponds to the selected source without treating AI judgment as proof that the source is factually true.
- Preserve AI provenance even when generated content is written into a local Markdown file.

## Non-Goals

- Archiving complete webpages, complete third-party videos, or complete copyrighted media by default.
- Treating screenshots, AI output, or AI verification as proof that a claim is true.
- Replacing JSON Canvas with an editable source graph.
- Allowing graph views to store independent colors or modify source records.
- Saving API keys, full prompts containing secrets, or provider credentials in the workspace.

## Source Identity

Every citation target has separate storage and provenance identities.

### Local Content

A human-authored local fragment points to:

- stable `constellation_id`
- workspace-relative file path
- heading, block, line, or media locator
- content hash or quoted anchor

Its color comes from the target file's real rainbow folder.

### URL Evidence

A URL citation points to a source evidence record with:

- stable evidence UUID
- original and resolved URL
- source collection ID
- media type
- selected locator
- capture and verification metadata
- optional minimum-scope evidence assets

Its color comes from the URL source collection.

### AI-Origin Evidence

AI-origin content remains an AI source even after it is written into a local Markdown file.

The source evidence record stores:

- provider and model identifier
- generation time
- output hash
- AI source collection ID
- optional local storage locator
- cited local or URL foundations
- verification status
- whether a human later revised the output

The local file remains a local document node. The AI-generated fragment remains an AI evidence node linked to that file through a neutral `storedIn` relation.

## Workspace Storage

Evidence is user knowledge and must not be placed in a rebuildable cache.

Recommended visible workspace structure:

```text
Sources/
├─ records/
│  └─ <evidence-id>.source.md
└─ assets/
   └─ <evidence-id>/
      ├─ capture.webp
      └─ thumbnail.webp
```

Each `.source.md` file is regular Markdown with frontmatter such as:

```yaml
---
constellation_id: "uuid-v7"
constellation_type: source
source_kind: url
source_collection_id: "uuid-v7"
media_type: image
original_url: "https://example.com/item"
resolved_url: "https://cdn.example.com/item"
captured_at: "2026-06-14T12:00:00Z"
content_hash: "blake3:..."
verification_status: verified_exact
---
```

The body records a human-readable title, selected locator, quoted text when applicable, evidence asset links, and verification notes. Unknown frontmatter fields must be preserved.

### Standard Markdown Expression

A durable URL or AI citation inserts a standard Markdown link to its evidence record, for example:

```markdown
[引用图片来源](../Sources/records/018f.source.md)
```

The UI routes a linked file with `constellation_type: source` to the source preview container. Raw Markdown remains readable in other editors.

A bare external URL remains an ordinary hyperlink until the user promotes it to a verified source citation. Promotion creates the `.source.md` record and replaces or accompanies the bare URL with a standard relative Markdown link. No private citation syntax is required.

Source collection colors are UI configuration and belong in:

```text
.constellation/source-collections.json
```

The file stores collection IDs, names, kinds, colors, and archived state. It does not store evidence bodies.

## Source Collections And Colors

### Local

Local citations inherit the target file's folder color from `.constellation/folders.json`.

### URL

URL evidence is grouped into user-editable collections. Suggested initial grouping may use:

- website origin
- creator or channel
- publication or archive
- user-selected research project

### AI

AI evidence is grouped into user-editable collections such as:

- research session
- generation project
- model-assisted manuscript
- image generation batch

Provider or model may be shown as metadata but does not have to define the collection.

### Shared Visual Rule

The selected source color drives:

- capsule border and surface tint
- solid capsule marker
- expanded connector
- preview frame border
- graph source node
- explicit source citation edge

Media type never consumes the color channel. It uses a small icon or badge.

Source collections can be archived but cannot be silently deleted while referenced. Reassignment keeps a history entry.

## Capsule And Connector

The existing cutout markers remain:

- local file: cutout folded-file symbol
- URL: cutout `U`
- AI: cutout `AI`

Connector patterns remain:

- local: one complete rounded solid connector
- URL: two long rounded solid segments
- AI: three short rounded segments

The marker, capsule, connector, and preview frame all use the same resolved source color.

## Unified Source Preview Container

The rectangle is a source preview container, not a text-only quotation box.

It has a stable shell:

1. header: source marker, source name, media badge, verification state
2. primary preview: renderer selected by media type
3. locator: lines, crop region, page region, or time range
4. provenance: captured time, storage location, and source collection
5. actions: open source, view evidence, retry, rebind

### Media Renderers

| Media type | Primary preview |
|---|---|
| Text | quoted paragraph, heading, and line or block locator |
| Image | thumbnail or selected crop with an open-original action |
| Video | poster frame, title, and start/end time |
| Audio | compact waveform or poster with start/end time |
| PDF | rendered page crop, page number, and region locator |
| Webpage | title, site, selected excerpt or media thumbnail, capture time |
| Mixed | one primary media preview plus a concise description and attachment count |

The container keeps the same outer width and border treatment across media types. Large media opens in a focused viewer rather than expanding the editor indefinitely.

## Minimum Evidence Package

Creating an external citation automatically attempts to preserve the smallest useful evidence range.

### Saved Evidence

- original and resolved locator
- title, author or publisher when available
- capture timestamp
- selected quote or media locator
- content hash
- minimum-scope screenshot or rendered crop
- media thumbnail or poster when needed
- verification result and reason

### Capture Limits

- Webpage: selected region, not a full-page archive by default.
- Image: selected crop plus a low-resolution context thumbnail when permitted.
- Video: poster frame and time range, not the full video.
- Audio: waveform or poster and time range, not the full audio.
- PDF: cited page region, not a copied full document unless it is already a user-owned local attachment.
- AI text: generated excerpt or its local storage locator.
- AI image or media generated for the user: the actual generated output may be stored as a workspace attachment with generation provenance.

The evidence package demonstrates what Constellation captured at a given time. It does not prove factual truth or provide a trusted external timestamp.

## Verification Pipeline

Verification runs when an external citation is created or explicitly refreshed.

### Deterministic Checks

1. Resolve and normalize the target.
2. Confirm the target is accessible or report the access barrier.
3. Confirm the selected locator exists.
4. Match exact text, hashes, page regions, crop bounds, or time bounds.
5. Capture the minimum evidence package.

### AI Correspondence Check

When an authorized AI provider is configured, AI compares the user's selected claim or current sentence with the selected source fragment and returns one status:

- `verified_exact`: directly and accurately supported
- `verified_partial`: only part of the statement is supported
- `related_only`: topically related but not evidentiary
- `contradicted`: the selected source conflicts with the statement
- `locator_missing`: the claimed fragment cannot be found
- `unreachable`: the source cannot currently be accessed
- `not_checked`: AI is disabled, unavailable, or not authorized

AI cannot upgrade a missing locator to verified and cannot declare the source itself factually true.

If no claim text is selected or inferable, the system performs only deterministic locator checks and records `not_checked` for semantic correspondence.

### Save Behavior

Verification failure does not block saving. The citation is saved with a prominent unverified or conflict state. The user may retry, choose another locator, or rebind the source.

First-time external transmission still requires provider and data-scope consent. API keys remain in system secure credential storage.

## Source Loss And Change

A citation and its evidence record remain when the live source disappears.

Statuses include:

- temporarily unavailable
- authentication required
- moved
- deleted
- content changed
- AI provider unavailable
- underlying evidence missing

The preview container displays the last captured evidence with:

> Historical capture from `<timestamp>`; the live source is unavailable or has changed.

Captured evidence must never be presented as a current live preview.

Rebinding creates a new target relationship and retains the old evidence record and repair history. It must not silently replace the original identity.

## Knowledge Graph

### Nodes

- local document: folder color and folded-file marker
- URL evidence: source collection color, `U` marker, media badge
- AI evidence: source collection color, `AI` marker, media badge

Source collection is expressed through color and filtering, not by adding decorative collection nodes by default.

### Edges

- local explicit reference: continuous solid edge
- URL citation: long segmented solid edge
- AI-origin citation: short segmented edge
- `storedIn`: thin neutral edge between AI evidence and a local file
- `basedOn`: evidence edge from AI content to real local or URL foundations
- AI similarity: faint dotted edge, independent and off by default

The graph defaults to item-level source nodes. It may aggregate many identical source items for performance, but selection must reveal the exact evidence records.

### Filters

- local / URL / AI
- text / image / video / audio / PDF / webpage / mixed
- verified / partial / unverified / unavailable / changed
- source collection
- show AI storage and foundation relations

The graph remains read-only navigation and inspection. It does not edit evidence packages or become a free-position canvas.

## AI Content Stored Locally

If AI generates content directly into a Markdown file:

- the document keeps its local folder identity and color
- the generated fragment keeps an AI evidence identity and source collection color
- citations to the whole file use local identity
- citations specifically to the generated fragment use AI identity
- the preview shows `stored in <file>` as secondary provenance
- human editing adds a `human_revised` state without erasing AI origin

If generated content has no real foundations, it is labeled `AI-generated, no external evidence`. If foundations later disappear, it becomes `underlying evidence missing`.

## UI Calibration Requirements

The calibration HTML must show:

- three distinct source collection colors for local, URL, and AI examples
- the same color propagated to capsule, connector, preview frame, graph node, and citation edge
- text, image, video/PDF, and AI-in-local-file preview examples
- verification states including exact, partial, unverified, changed, and unavailable
- a historical evidence screenshot state after source loss
- a graph legend and filters for source kind, media type, verification, and collection
- `storedIn` and `basedOn` graph relations without confusing them with AI similarity
- a palette surface that can target either a folder or a source collection

## Error And Privacy Rules

- Capture or verification failure must not erase the user's citation.
- A source requiring authentication must not leak credentials into screenshots, logs, or evidence records.
- Sensitive regions must be excluded before capture.
- External content sent to AI must follow existing outbound-data consent and allowed-folder rules.
- Evidence assets use workspace-relative paths and participate in backup and sync.
- Removing evidence assets is a destructive operation and must require confirmation or use the workspace recycle bin.

## Acceptance Criteria

- Local, URL, and AI examples have visibly different source colors in the editor and graph.
- Changing a source collection color updates every related visual surface without changing media badges.
- AI content stored in Markdown retains separate local storage and AI provenance identities.
- Every external preview type can degrade to a metadata-only state.
- Saving an unverified citation is allowed and visibly marked.
- A lost source still displays its historical evidence package and repair actions.
- AI verification never reports success when the locator is missing or the source is unreachable.
- Evidence files are stored outside `.constellation/cache/`.
- No complete third-party page or media archive is created by default.
