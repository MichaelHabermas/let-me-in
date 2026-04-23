---
name: do-improvements
description: Turns architecture-review or deep-module RFCs into an ordered execution plan and implements the full backlog with SOLID, DRY, and modular boundaries. Use after improve-codebase-architecture, when the user pastes a numbered refactor list, references GitHub architecture issues, or says "do improvements", "implement the architecture plan", "do all the refactors", or "execute the RFC backlog".
---

# Do Improvements

Follow-up to `improve-codebase-architecture`: consume its outputs (GitHub issues, notes, or a user-pasted list) and **ship** the refactors—not another discovery pass unless a dependency is unknown.

## When to use

- User finished (or skipped) interface picking and has one or more RFCs / items to land.
- User says variants of: do improvements, implement all, execute the backlog, land the deep-module refactors, work through the architecture list.

## Inputs (pick what exists)

1. **GitHub issues**: URLs or numbers; read bodies with `gh issue view`.
2. **Session artifact**: Numbered list from a prior chat (paste or file path).
3. **Implicit scope**: If only one RFC exists, scope is that issue unless the user widens it.

If the backlog is ambiguous or items conflict, **stop and ask** once with concrete options—do not invent scope.

## Principles (apply throughout)

- **SOLID**: especially single responsibility and dependency inversion at module seams; prefer small, stable interfaces over wide surfaces.
- **DRY**: deduplicate after moves/extractions; prefer one authoritative place for rules and types; avoid speculative abstraction.
- **Modular design**: deepen shallow modules where the RFC says to; keep boundaries explicit; favor boundary tests over re-testing internals.

## Phase 1 — Inventory and ordering

1. List every backlog item with a one-line goal and primary paths touched.
2. Propose an **execution order** with short rationale. Default heuristics (override when RFCs say otherwise):
   - **Dependency order**: items that introduce types or ports before adapters/callers.
   - **Risk / blast radius**: mechanical moves before behavior changes; narrow modules before cross-cutting rewires.
   - **Test leverage**: refactors that unlock cheaper tests for later items come earlier when safe.
3. Call out **mergeability**: suggest chunking into commits/PRs if any item is large; recommend what can ship independently.

Present the ordered plan to the user, then proceed unless they correct the order.

## Phase 2 — Per-item execution loop

For each item in order:

1. **Restate acceptance**: what "done" means from the RFC (tests, callers updated, deprecated paths removed if agreed).
2. **Implement** with minimal scope creep; if you see a clearly better adjacent fix (small, same files), note it as a **recommendation** and either bundle it (if trivial) or defer it explicitly.
3. **Verify**: run the narrowest relevant checks (unit tests, typecheck, lint) after the item; fix regressions before moving on.
4. **Checkpoint**: brief note of what changed and what remains—helps long sessions and handoffs.

## Phase 3 — Closure

- Summarize shipped vs deferred recommendations with paths.
- If issues tracked this work, suggest titles/comments for closing or follow-ups (do not assume `gh` auth).

## Anti-patterns

- Starting a second full-architecture exploration instead of executing.
- Reordering silently without explaining dependency or risk reasons.
- Giant unreviewable diffs when the backlog can be sliced vertically.

## Coordination with `improve-codebase-architecture`

That skill produces **candidates**, **interface options**, and an **RFC issue**. This skill assumes a **chosen direction** per item (or the RFC documents the decision). If the decision is missing, ask the user which interface variant to implement before coding.
