---
name: do-epic
description: >-
  Executes a named product epic end-to-end from repository docs and code: discovery,
  written plan (plan mode), then implementation, tests, docs, and a human-facing
  summary. Use when the user says "do epic", "run do-epic", "implement an epic",
  or provides an epic id/name/slice to ship from the PRD or roadmap.
---

# Do Epic

Autonomous software engineering workflow for completing **one epic** inside an existing repository using only in-repo documentation, code, tests, and artifacts. Do not invent requirements—derive them from the repo.

## Preconditions

1. **Epic identifier** — The user must supply which epic to do (name, number, slug, or section title from `docs/PRD.md` or equivalent). If it is missing, **stop and ask** for:
   - Epic name or id
   - Where it is defined (default: `docs/PRD.md`, also check specs/roadmap if present)

2. **Mode discipline (required)** — Start in **Plan** mode:
   - Produce a concrete execution plan (tasks, dependencies, completion criteria, risks/assumptions).
   - Do not write production code or run invasive repo changes until the plan exists and the user has had a chance to react if they are collaborating on the plan.
   - After the plan is settled, switch to **Agent** mode and implement it.

If the product forbids mode switching, still **plan first in the same session** (explicit plan message) before implementation.

## Operating principles

- SOLID, DRY, modular composable design
- Clarity and maintainability over cleverness
- Optimize for long-term extensibility within scope; treat stated acceptance criteria as a **minimum** bar

## Process

### 1. Discovery and understanding

- Locate all documentation for the epic (e.g. `docs/PRD.md`, `docs/SPECS.txt`, ADRs, tickets mirrored in-repo).
- For **where code actually lives**, cross-check `docs/PRE-WORK.md` **As-built repository pointers**, `docs/PRD.md` §2.7 (repository tree), and `README.md` **Source layout (current)** — e.g. gate orchestration is `src/app/mount-gate.ts` + `src/app/gate-session.ts`, not `src/ui/gate-view.ts`; bootstrap is `bootstrapApp({ mount, persistence? })`; ORT imports are funneled through `src/infra/onnx-runtime.ts`.
- Infer requirements, constraints, and acceptance criteria; map relevant code and tests.
- Flag gaps, ambiguities, or conflicts. If something critical is unknown, **state assumptions explicitly** before building on them.

### 2. Planning (plan mode)

- Break **this epic** into small, testable tasks with clear **done** definitions.
- Order tasks by dependencies; call out parallelizable work.
- Identify validation strategy (commands, manual checks, environments).
- Output the plan as a checklist the agent can execute sequentially.

### 3. Implementation (agent mode)

- Prefer **feature branches**: `feature/epic-<slug>/<task-name>` (adapt to repo conventions if different).
- **Frequent, meaningful commits**; messages explain *why*, not only *what*.
- Preserve separation of concerns, reusable pieces, minimal duplication, clean module boundaries.

### 4. Testing and validation

- Add or update unit tests; integration/e2e when the epic warrants it.
- Ensure existing tests pass; new behavior has meaningful coverage.
- Verify against inferred acceptance criteria (not only “green CI”).

### 5. Refactoring

- Refactor as you go when clarity or architecture drifts; avoid piling “cleanup later” debt.

### 6. Documentation

- Update only docs that the epic touches or that future maintainers need (README section, `docs/PRD.md` §2.7 / task file lists if paths changed, `docs/PRE-WORK.md` **As-built repository pointers** if you introduced a new seam, architecture notes, inline comments where non-obvious).
- Explain what was built, why key decisions were made, and how to extend.

## Completion criteria

The epic is done when:

- Inferred requirements for **this epic** are implemented
- Code is clean, modular, and consistent with the codebase
- Tests pass with meaningful coverage for new behavior
- Documentation is enough for a new developer to use and extend the feature

## Final report to the human

End with a concise, plain-language summary:

1. **What was built** — high level, minimally jargony
2. **What changed** — key modules, APIs, or systems
3. **What the user should see** — UX/flows/CLI behavior
4. **How to validate** — step-by-step, with example inputs/outputs where useful
5. **Assumptions and open questions** — anything inferred or left unresolved
