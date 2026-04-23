---
name: do-improvements
description: Turns architecture-review or deep-module RFCs into an ordered execution plan and implements the full backlog with SOLID, DRY, and modular boundaries—by default does every item (not a subset), in the most sensible order, after a short plan. Use after improve-codebase-architecture, when the user pastes a numbered refactor list, references GitHub architecture issues, or says "do improvements", "implement the architecture plan", "do all the refactors", or "execute the RFC backlog". When no external backlog exists, derives work from the current chat session (assistant suggestions, agreed next steps, open todos) and implements all of those unless scope is narrowed.
---

# Do Improvements

Consume a backlog from GitHub issues, a user-pasted list, or—when those are missing—**the current chat** (`improve-codebase-architecture` output is one source, not the only one). **Ship** the work; do not start another full discovery pass unless a dependency is unknown.

## Default behavior (unless the user narrows scope)

**Do all of them.** Build a plan that covers **every** backlog item, order them in the **most sensible** way (dependencies, risk, test leverage—same heuristics as Phase 1), then **implement the whole plan** through Phase 2 for each item. Do not stop after the plan, do not cherry-pick "the easy three," and do not ask which items to skip unless the backlog is empty, conflicting, or the user already said to limit scope (e.g. "only #2," "skip tests for now," "docs only").

## When to use

- User finished (or skipped) interface picking and has one or more RFCs / items to land.
- User says variants of: do improvements, implement all, execute the backlog, land the deep-module refactors, work through the architecture list.
- User invokes this skill **without** a pasted list or issue link: treat the **current conversation** as the source of truth (see **Session context fallback** below).

## Inputs (pick what exists, in priority order)

1. **GitHub issues**: URLs or numbers; read bodies with `gh issue view`.
2. **Session artifact**: Numbered list from a prior chat (paste or file path).
3. **Implicit scope**: If only one RFC exists, scope is that issue unless the user widens it.
4. **Session context fallback** (use when 1–3 are absent or empty): Build the backlog from **this chat only**—do not start a new architecture pass.
   - **Mine the thread** for: explicit recommendations the assistant made, "we should…" / "next step…" items the user agreed to or did not object to, TODO lists created in-session, follow-up fixes after a review, and concrete file or behavior changes already named.
   - **Normalize** into a numbered list (one line per item, primary paths if known). Apply Phase 1 ordering heuristics to that list.
   - **If the thread has zero actionable items**, say so in one short paragraph and ask the user for one concrete goal or paste; do not invent a large fictional backlog.
   - **If items conflict**, **stop and ask** once with concrete options—same bar as other inputs.

If the backlog is ambiguous or items conflict, **stop and ask** once with concrete options—do not invent scope. Session-derived backlogs are allowed when they are **grounded in quoted or paraphrased thread content**; vague "make it better" without any prior specifics still requires one clarifying question.

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

Present the ordered plan briefly (every item listed in execution order), then **execute all of them** in that order. If the user corrects the order or explicitly shrinks scope, follow that; otherwise the default is full completion.

## Phase 2 — Per-item execution loop

For each item in order:

1. **Restate acceptance**: what "done" means from the RFC or session item (tests, callers updated, deprecated paths removed if agreed).
2. **Implement** with minimal scope creep; if you see a clearly better adjacent fix (small, same files), note it as a **recommendation** and either bundle it (if trivial) or defer it explicitly.
3. **Verify**: run the narrowest relevant checks (unit tests, typecheck, lint) after the item; fix regressions before moving on.
4. **Checkpoint**: brief note of what changed and what remains—helps long sessions and handoffs.

## Phase 3 — Closure

- Summarize shipped vs deferred recommendations with paths.
- If issues tracked this work, suggest titles/comments for closing or follow-ups (do not assume `gh` auth).

## Anti-patterns

- Planning without then **implementing every in-scope item** (unless the user blocked you or narrowed scope).
- Implementing a partial backlog when the user gave no reason to subset.
- Starting a second full-architecture exploration instead of executing.
- Reordering silently without explaining dependency or risk reasons.
- Giant unreviewable diffs when the backlog can be sliced vertically.
- Ignoring **session context fallback** when the user clearly meant "do what we already discussed" with no pasted RFC.
- Hallucinating a backlog when the conversation never named specific changes—ask instead.

## Coordination with `improve-codebase-architecture`

That skill produces **candidates**, **interface options**, and an **RFC issue**. This skill assumes a **chosen direction** per item (or the RFC documents the decision). If the decision is missing, ask the user which interface variant to implement before coding.

When `improve-codebase-architecture` was never run, **session context fallback** (input 4) is the normal entry: the "RFC" is the accumulated suggestions and decisions already visible in the chat.
