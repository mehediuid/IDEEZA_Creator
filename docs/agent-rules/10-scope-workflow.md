# Scope & workflow

## Scope
1. Do exactly what was asked — nothing more. No unsolicited features,
   refactors, or "improvements" to nearby code.
2. Keep the diff minimal; never touch files unrelated to the task.
3. No new dependencies without asking first.
4. If the task is ambiguous, or needs a structural change, ask **before**
   writing code.
5. If your work is mixed into files that carry someone else's uncommitted
   changes, never `git add -A`. Stage your files explicitly and say what you
   left out.

## Process
6. Use the superpowers skills: **brainstorming** before building a feature,
   **writing-plans** for multi-step work, **systematic-debugging** for any
   bug, **verification-before-completion** before claiming done.
7. A backlog handover authorises the whole list: batch the work, verify each
   item, keep going, report once at the end. Do not stop between items to ask
   permission for the next one.
8. Deliverables the user must review (design specs, mockups, plans) are
   published pages/documents, not terminal text.

## Tickets (Jira)
9. Move the ticket to **In Progress before** writing code.
10. Move it to **Ready for Testing** when the work is done and verified.
11. Comments are in a human developer's voice and describe only what was done
    — no commit hashes, no code internals, no file paths.

## Git
12. Commit messages: `feat(scope): …` / `fix(scope): …`, with the *why* in the
    body. One logical change per commit.
13. **Push only after the user verifies** the work, or when the user says
    "push"/"deploy". Never push on your own initiative.
14. Before overwriting or deleting anything you did not create, look at it
    first; if reality contradicts the task's description, surface that instead
    of proceeding.
