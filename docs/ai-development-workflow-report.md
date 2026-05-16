# AI Workflow Report (Structured, Chat-Based)

## Operating Model

### Role split

- AI acted as primary implementation engine.
- Developer acted mainly as reviewer and product owner.
- Manual coding existed, but mostly for correction, constraint-setting, and acceptance-level adjustments.

### Work mode distribution

- About 95% of implementation iterations were performed in local interactive mode.
- About 5% of work used background mode for larger or longer tasks.

### Session pattern used repeatedly

1. Define desired behavior and UX constraints.
2. Ask AI for plan/analysis when expected change scope was large.
3. Move to implementation prompts.
4. Validate via build/run and visual checks.
5. Feed back concrete errors/mismatches.
6. Repeat until behavior matched expectation.

---

## Prompting Strategy Used in Practice

### 1) Constraint-first prompting

Prompts worked best when they included strict boundaries: what to change, what to remove, and what not to add.

### 2) Documentation-anchored prompting

For UI and routing tasks, prompts were paired with official documentation links and expected usage patterns. This significantly improved component behavior and reduced guesswork.

### 3) Error-driven refinement

When runtime/build issues appeared, prompts included exact error traces and reproduction context. This produced faster fixes than abstract bug descriptions.

### 4) Incremental delivery for large changes

Large features were split into planning + implementation + polish phases, instead of one broad prompt. This reduced rework and made acceptance clearer.

### 5) Acceptance-driven revisions

Prompts frequently expressed specific accept/reject preferences (layout, spacing, control type, interaction details), which helped converge quickly on final UX.

---

## Chronological Workflow Narrative (From Chat)

### Phase A — UI enhancement and early CRUD loops

Initial sessions focused on visual quality and interaction improvements. AI-generated output was reviewed quickly, then adjusted through targeted feedback around hover behavior, table ergonomics, and action controls. The main pattern here was short iteration loops with immediate UX correction.

### Phase B — API contract reliability and generation workflow

The process shifted from manual API patterns toward generated schema/client flows. Prompts emphasized correctness and maintainability over speed, then followed with migration prompts to remove old manual paths. Acceptance depended on consistency and reduced duplication.

### Phase C — Categories experience redesign

This phase involved multiple redesign passes. The workflow used concrete behavioral expectations (layout geometry, interaction mode, edit-mode behavior) and repeated visual correction cycles. Failures were resolved by supplying explicit runtime errors and narrowing component behavior requirements.

### Phase D — Transaction filtering and readability model

Prompts moved from “feature exists” to “feature feels right.” AI output was refined around filter discoverability, control ergonomics, and data readability. Choices were repeatedly changed when interaction cost was too high (for example, modal-heavy behavior replaced by inline/expanded controls).

### Phase E — Analytics behavior and data ownership

The process emphasized backend-driven computation and frontend simplicity. Prompts pushed AI away from heavy client computation and toward aggregation behavior that matched expected ranges and intervals. Visual feedback then tuned loading and transitions to preserve smooth chart updates.

### Phase F — Navigation, profile/settings, and modal/routing behavior

This phase was highly iterative and UX-sensitive. Prompts focused on navigation clarity and practical interaction flow. When regressions appeared (for example, update loops or interaction breakage), the workflow switched to strict bug-fix prompts with concrete error output and immediate retest.

### Phase G — Import/restore and data integrity corrections

Prompts in this phase were failure-first: AI was guided by exception traces and strict desired outcomes (reset behavior, integrity, import completeness). Fixes were accepted only after behavior aligned with operational intent, not only after compilation success.

### Phase H — Refactoring and simplification

Later sessions shifted to reducing complexity introduced by fast iteration. Prompts explicitly requested removal of overengineered branches and normalization around cleaner state/query patterns. Acceptance favored simplicity and predictable behavior over added abstraction.

---

## How Acceptance Decisions Were Made

### Typical accept criteria

- Behavior matches explicitly described interaction.
- No regression in adjacent flows.
- Build passes and runtime errors are resolved.
- Result is maintainable and not overcomplicated.

### Typical reject criteria

- Correct code but wrong UX behavior.
- Added features not requested.
- Fragile or workaround-heavy logic.
- Reintroduction of complexity previously removed.

### Typical change requests after AI output

- Tighten scope to exact requirement.
- Replace component/control choice.
- Move logic between layers for better responsibility split.
- Remove inferred behavior and keep user-controlled data explicit.

---

## Models, Tools, and External Systems Actually Used

### Models

- Main: GPT-5.3-Codex
- Secondary: Opus 4.6
- Rare use: GPT-5 mini

### Development tooling workflow

- Main day-to-day work in Copilot/IDE chat flow.
- Earlier stage included GitHub CLI usage before relying more on IDE-integrated flow.

### MCP usage

- GitHub MCP was actively used for repository-related operations.
- NuGet MCP was available, but skill-based package workflow was preferred in practice.

---

## What Worked Well

1. Starting large tasks with plan/analysis before coding.
2. Writing prompts with explicit constraints and non-goals.
3. Providing official docs links for the exact UI/routing behavior expected.
4. Sending full runtime errors for quick, precise debugging.
5. Iterating in small acceptance cycles instead of waiting for “big bang” completion.

---

## What Worked Poorly

1. Broad prompts without strict acceptance details produced churn.
2. Combining major UX redesign and deep logic changes in one prompt increased rework.
3. Under-specified interaction details caused “technically correct but practically wrong” output.
