# Reference Capsule Symbols Design

## Scope

This change only adjusts the static Constellation v4 UI calibration HTML and its documentation. It does not add runtime frontend or backend behavior.

## Visual Rule

- Every reference capsule keeps one solid circular marker with the same size.
- The capsule color fills the circle. The capsule surface color cuts out a folded file for local files, `U` for URLs, and `AI` for AI sources.
- The circular marker remains `17px`, while each centered SVG is calibrated independently.
- The folded-file mask uses an `11px` canvas with `1.4px` rounded strokes and enough inset to avoid touching the circle.
- The narrow `U` mask uses a `10px` canvas with `1.5px` rounded strokes.
- The uppercase `AI` mask uses an `11px` canvas with `1.4px` rounded strokes. The `I` is one vertical rounded stroke with no top or bottom bars.
- URL and AI markers use explicit SVG paths rather than font glyphs, preventing platform font metrics from changing their weight or spacing.
- Type is communicated by symbol shape, not by color, dot count, fill style, or line segmentation.
- The cutout always matches the capsule surface instead of using fixed white or a fixed type color.
- A local-file capsule inherits the target file's rainbow folder color.
- URL and AI capsules may use their own source capsule color, but must not receive fixed blue or purple type colors.

## Relationship To Expanded References

The capsule marker is independent from the expanded reference connector:

- Local file: folded file symbol plus one complete rounded solid connector.
- URL: `U` marker plus two long rounded solid segments.
- AI source: `AI` marker plus three short rounded segments.

All expanded content rectangles retain the same width and solid border treatment.

## Verification

- All reference capsule examples declare `data-reference-kind="local"`, `"url"`, or `"ai"`.
- The legacy arrow marker is absent.
- The local-file, `U`, and `AI` masks use the capsule surface color over a solid inherited-color circle.
- Computed styles retain a `17px` marker and expose centered `11px`, `10px`, and `11px` masks for local, URL, and AI sources.
- URL/AI markers contain no font-generated text, and the AI path contains no horizontal serif bars on `I`.
- Dynamic Markdown references render as local-file capsules.
- README and AGENTS describe the same visual rule.
