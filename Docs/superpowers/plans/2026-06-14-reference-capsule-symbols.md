# Reference Capsule Symbols Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make local-file, URL, and AI reference capsules immediately distinguishable through solid inherited-color circles with surface-color cutouts.

**Architecture:** Keep the calibration prototype's existing capsule component and its `data-reference-kind` discriminator. A solid circle uses the inherited capsule color, while a positioned overlay uses the exact capsule surface color to create folded-file, `U`, and `AI` cutouts without fixed white.

**Tech Stack:** Static HTML, CSS custom properties, inline SVG data URI masks, JavaScript template strings, Markdown documentation.

---

### Task 1: Add Capsule Type Symbols

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`

- [x] **Step 1: Run a failing source assertion**

Run a PowerShell assertion that requires every `.reference-chip` source occurrence to declare a valid `data-reference-kind`.

Expected: FAIL with `typed reference chips 0 of 10`.

- [x] **Step 2: Add inherited-color symbol masks**

Replace the legacy arrow marker with a solid inherited-color circle and surface-color folded-file, `U`, and `AI` cutout overlays selected by `data-reference-kind`.

- [x] **Step 3: Type every static and generated capsule**

Mark local-file, URL, and AI examples explicitly. Generated Markdown references use `local`.

- [x] **Step 4: Repeat the source assertion**

Expected: PASS with all capsule occurrences typed and no legacy arrow marker.

### Task 2: Synchronize Documentation

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

- [x] **Step 1: Document the symbol-only type encoding**

State that the folded file, `U`, and `AI` markers identify the reference type while colors continue to inherit from the capsule and target folder.

- [x] **Step 2: Check documentation and source diffs**

Run `git diff --check` and verify the root `LICENSE` has no diff.

Expected: no whitespace errors and no `LICENSE` changes.

### Task 3: Calibrate Each Symbol Independently

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`
- Modify: `Docs/superpowers/specs/2026-06-14-reference-capsule-symbols-design.md`
- Modify: `README.md`
- Modify: `AGENTS.md`

- [x] **Step 1: Run a failing independent-calibration assertion**

Require local-file, URL, and AI markers to use explicit SVG masks with independent size and stroke values, and require the uppercase AI marker to use a single vertical `I` without horizontal bars.

- [x] **Step 2: Redraw the three SVG paths**

Keep the `17px` inherited-color circle. Use `11px/1.4px` for the inset folded file, `10px/1.5px` for the narrow `U`, and `11px/1.4px` for uppercase `AI`; preserve the A/I gap and draw `I` as one rounded vertical stroke.

- [x] **Step 3: Verify all themes**

Use browser-computed styles in Light, Warm, and Dark to confirm equal mask sizes, centered placement, unchanged capsule height, and absence of page errors.
