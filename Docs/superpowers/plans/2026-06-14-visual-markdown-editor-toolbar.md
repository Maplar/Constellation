# Visual Markdown Editor Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the calibration editor default to visual Markdown editing with a compact Word-style toolbar and move raw Markdown source into an advanced overflow menu.

**Architecture:** Keep the static calibration page as one HTML artifact. Use a `contenteditable` visual surface for interaction calibration, a hidden advanced source surface for inspection, and small native-JavaScript command bindings; document that the real implementation must use a structured editor model and Markdown AST.

**Tech Stack:** HTML, CSS Variables, native JavaScript, Playwright visual verification.

---

### Task 1: Lock the UI contract

**Files:**
- Test: `Docs/ui-calibration/constellation-v4-ui-calibration.html`

- [x] **Step 1: Write a failing static assertion**

Assert that the editor contains `contenteditable="true"`, title-level controls, left/center/right alignment commands, an advanced source menu, and no visible edit/split/preview segmented control.

- [x] **Step 2: Run the assertion and verify it fails**

Run the PowerShell assertion against the current HTML.

Expected: FAIL because the current editor defaults to a raw Markdown textarea and exposes three mode buttons.

### Task 2: Build the visual editor toolbar

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`

- [x] **Step 1: Replace the visible mode switch**

Show a compact “可视编辑” status and an overflow button. Put “查看 Markdown 源码（高级）” and “返回可视化编辑” inside the overflow menu.

- [x] **Step 2: Add the toolbar**

Add paragraph style, undo/redo, bold/italic/strike/code, alignment, list/quote/divider, link/reference/image/attachment controls between the title and editable body.

- [x] **Step 3: Make the rendered body editable**

Set the rendered document body as the default `contenteditable` surface and hide the source pane unless advanced source mode is selected.

- [x] **Step 4: Bind calibration interactions**

Use native formatting commands for visual feedback, preserve the existing reference workflow, mark edits unsaved, and return to visual mode after inserting a reference or creating a note.

### Task 3: Synchronize architecture documentation

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`

- [x] **Step 1: Add the editor boundary to AGENTS**

Require visual editing by default, hide source behind an advanced action, keep the toolbar compact, and require structured Markdown/AST conversion in the real implementation.

- [x] **Step 2: Update README status**

Describe the visual editor toolbar as statically calibrated while keeping the real editor runtime marked as pending.

### Task 4: Verify

**Files:**
- Verify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`
- Verify: `README.md`
- Verify: `AGENTS.md`

- [x] **Step 1: Run the static assertion**

Expected: PASS for visual editor, toolbar controls, hidden advanced source, and removal of direct mode switching.

- [x] **Step 2: Run Playwright checks**

Verify toolbar visibility, content editing, heading and alignment commands, advanced source opening/closing, Light/Dark/Warm themes, and no browser errors.

- [x] **Step 3: Run repository checks**

Run `git diff --check`, check Markdown links, and verify the root `LICENSE` SHA-256 remains unchanged.

### Task 5: Polish formal editor surfaces

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`
- Modify: `AGENTS.md`
- Modify: `README.md`

- [x] **Step 1: Remove the full-height focus rail**

Keep the text caret but remove the `inset` focus shadow from the editable document.

- [x] **Step 2: Theme the scrollbars**

Use transparent tracks and narrow rounded neutral thumbs for the editor and relation panel across Light, Dark, and Warm.

- [x] **Step 3: Replace the native heading select**

Use a Design Token-driven rounded menu for body, H1, H2, and H3 with explicit selected state.

- [x] **Step 4: Record the formal frontend constraints**

Document that these are production UI requirements, not calibration-only exceptions.
