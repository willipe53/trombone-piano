---
name: evaluate-plan
description: >-
  Evaluate a plan file (usually written by a different model) for accuracy,
  completeness, and clarity against the current state of the branch. Use when
  the user types "evaluate" followed by an @-mentioned plan file, e.g.
  "evaluate @my-plan.md", or asks to review/vet a plan another model wrote.
---

# Evaluate Plan

The user @-mentions a plan file, usually authored by a different model in a
separate conversation. The job is to verify the plan against the codebase as
it exists on the current branch, fix what is obviously wrong, and surface
everything else for iterative discussion.

## Workflow

1. **Read the plan file in full.** Note every file path, function, endpoint,
   table, component, and claim about "current state" that it makes.

2. **Verify against the current branch.** For each concrete reference in the
   plan, check the codebase:
   - Do the named files, functions, handlers, and components exist, and do
     the described signatures/behaviors match?
   - Are descriptions of the current state accurate, or stale (e.g., the
     plan was written before recent commits or uncommitted changes)?
   - Is any proposed work already done on this branch?
   - Does the plan conflict with project rules (no cross-database joins,
     shared vs. shard separation, deploy ordering, Decimal for financials,
     MUI-for-heavy/Tailwind-for-simple, naming conventions)?
   - Are there gaps: steps the plan needs but omits (migrations, openapi.yaml
     changes, cache invalidation, permission checks, tests)?

3. **Assess clarity.** Flag steps that are ambiguous, ordered wrong, or
   underspecified enough that an implementer could go astray.

4. **Ask clarifying questions if necessary** (use the AskQuestion tool when
   available). Only for decisions that are genuinely the user's to make; do
   not ask about things the codebase already answers.

5. **Fix obvious problems directly in the plan file**: wrong file paths,
   wrong function/table/endpoint names, stale current-state descriptions,
   steps already completed, typos, misordered deploy steps. Preserve the
   plan's structure and voice; edit, don't rewrite.

6. **Enumerate remaining observations in the response** — anything
   judgment-dependent, architectural, or scope-changing. Number them so the
   user can address them iteratively ("fix 2 and 4, skip 3").

## Response Format

- Lead with an overall verdict (sound / sound with fixes / has material
  problems).
- List **Edits made to the plan** (brief, one line each).
- List **Open observations** as a numbered list, each with what the plan
  says, what the codebase shows, and a recommendation.
- No emojis. Do not begin implementing the plan; this is a review pass only.
