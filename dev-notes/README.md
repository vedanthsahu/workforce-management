# dev-notes/

This folder is a running engineering log for this repo: **what changed,
what was wrong before, why the change was needed, and how the data/control
flow actually works afterward.** It's checked into git and pushed
deliberately — it's meant to be read by any developer (or their AI
assistant) picking up work here, not just the person who wrote an entry.

## Why this exists

A diff shows *what* changed. A commit message, if it's good, shows *what*
in one line. Neither reliably captures *why* -- what was actually wrong
with the old behavior, what alternatives were considered and rejected,
what's still explicitly out of scope, or what a later change must not
accidentally undo. That context normally lives only in a conversation
(Slack, a call, a chat with an AI assistant) and then evaporates.

That's a specific problem for AI-assisted changes. An AI assistant
starting a new session has no memory of previous sessions -- it re-derives
everything from the current state of the code and whatever the user's
prompt says. Prompts are often short and ambiguous ("fix the bulk edit
API," "make seats stop getting deleted") because the person writing them
already has the context in their head and doesn't repeat it. Without
something like this folder, the assistant either has to guess at intent
or ask the user to re-explain decisions that were already made and
explained once, in a previous session, to a previous instance of itself.

**If you are an AI assistant working in this repo:** read the relevant
subfolder's `CURRENT.md` first -- that's the whole point of it existing.
Only pull specific `CHANGELOG.md`/`EXECUTION-FLOW.md` entries if you need
the reasoning behind a specific rule in `CURRENT.md`, or if you're
working on something `CURRENT.md` doesn't cover. Don't read either log
front-to-back by default -- they grow indefinitely and most of it won't
be relevant to your change. If your change is non-trivial, add a
`CHANGELOG.md`/`EXECUTION-FLOW.md` entry when you're done, and update
`CURRENT.md` if it changed something the file states as true.

## Structure

```
dev-notes/
  README.md              <- this file
  backend/
    CURRENT.md             <- what's true right now: read this first
    CHANGELOG.md           <- what changed, what was wrong, why -- append-only history
    EXECUTION-FLOW.md      <- how it actually works: functions, call chain, data flow
  frontend/
    CURRENT.md
    CHANGELOG.md
    EXECUTION-FLOW.md
```

Backend and frontend are separate on purpose: different people (and
different AI sessions) own each side, and interleaving both in one file
means everyone wades through history that isn't theirs to find the entry
that is. Read/write only the subfolder for the side you're actually
touching. If a change genuinely spans both (a new API contract both sides
need to agree on, for instance), it's fine to add an entry to both files
-- each written for that file's own audience -- rather than inventing a
third shared file for it.

## Three files, three jobs

- **`CURRENT.md` = what is true now.** A living summary of the
  architectural decisions, business rules, invariants, constraints, and
  API contracts that are currently in effect for that side of the repo --
  the things a developer or AI *must* know before changing that area.
  **Not append-only.** When a decision changes, edit `CURRENT.md` in
  place to state the new reality -- don't leave the old, now-wrong rule
  sitting next to the new one. The superseded reasoning stays alive in
  `CHANGELOG.md`, not here. If `CURRENT.md` and the code ever disagree,
  treat the discrepancy as an issue to investigate. Do not assume which
  one is correct; verify the current implementation and update
  `CURRENT.md` once the intended state is established.
- **`CHANGELOG.md` = why/how we arrived here.** Append-only history: what
  was wrong, why it needed to change, what actually changed, what was
  explicitly left out of scope. This is the record of *reasoning*, not a
  git diff -- don't paste diffs or restate what's already obvious from
  reading the code; write down what a diff can't show (why, what was
  rejected, what must not be undone later).
- **`EXECUTION-FLOW.md` = how the system works, and how that's evolved.**
  Append-only: given the current design, what's the actual call chain
  (route -> service -> repository -> table, or the frontend equivalent),
  and what functions were added/removed/renamed to get there. Written so
  someone can trace a request end-to-end without re-reading every file
  involved.

## Shared conventions for CHANGELOG.md / EXECUTION-FLOW.md

- **Append-only.** Never edit or delete a past entry, even if it turns out
  to be wrong or superseded -- add a new entry that says so instead. The
  history of "we thought X, then learned Y" is itself useful context.
- **Newest entry at the bottom** of each file.
- **Timestamp every entry**, `## YYYY-MM-DD HH:MM — <short title>`, so
  entries can be ordered and cross-referenced against git log / commit
  dates when needed.
- **When an entry supersedes an earlier decision**, say so explicitly --
  e.g. `Supersedes: 2026-08-06 entry on X`. Don't rewrite or remove the
  old entry; just make the relationship visible so a reader (or an AI
  skimming for context) doesn't mistake the old entry for still-current
  reasoning. This is exactly what `CURRENT.md` exists to make unnecessary
  for the *end state* -- but the changelog is where the lineage of a
  decision lives.

## How this differs from `docs/*.docx`

`docs/` holds polished, external-facing reference documents (architecture
overviews, security review write-ups) meant for people outside the
engineering team -- an architect, a reviewer, a stakeholder. `dev-notes/`
is the opposite: fast, informal, technical, written by and for whoever is
actively changing the code. Don't hold entries here to the same
presentation bar as `docs/` -- terse and accurate beats polished and slow
to write.
