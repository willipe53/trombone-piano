---
name: consume-evaluation
description: >-
  Read the evaluation of a plan performed by another model in a separate
  conversation, verify agreement with the plan edits and observations, and
  raise concerns or follow-ups. Use when the user (typically the model that
  authored the plan, often still in Plan mode) types "consume evaluation",
  "look at the evaluation done by the other model", "read the evaluation",
  or similar.
---

# Consume Evaluation

A second model reviewed this session's plan using the `evaluate-plan` skill
(triggered by "evaluate @ plan-name") in another conversation. It may have edited
the plan file directly and left numbered observations in its responses. The
job is to find that conversation, absorb it, and confirm or contest it.

## Workflow

1. **Locate the evaluation conversation.** Past chats live in the agent
   transcripts folder given in the session context (a path like
   `~/.cursor/projects/<project>/agent-transcripts/`). Each chat is
   `<uuid>/<uuid>.jsonl`; ignore the `subagents/` subdirectories. Find main
   transcripts whose user messages contain an "evaluate @" request, newest
   first:

   ```bash
   grep -l -i "evaluate @" ~/.cursor/projects/*/agent-transcripts/*/*.jsonl | xargs ls -t | head -3
   ```

   Adjust the path to the actual transcripts folder. Take the most recent
   match unless the user names a specific plan; then match on that plan name.
   Exclude the current conversation's own transcript, and sanity-check the
   candidate: it should actually contain a plan evaluation (verdict, plan
   edits, observations), not just a mention of the phrase. If nothing
   matches, say so and ask the user which conversation they mean.

2. **Read the evaluation transcript.** It is JSONL with `role`/`message`
   entries; user queries sit in `<user_query>` tags. Focus on the assistant's
   final responses: the verdict, the list of edits made to the plan, the
   numbered open observations, and any subsequent iterative discussion where
   the user accepted or rejected items.

3. **Re-read the current plan file** to see the evaluator's edits in place.

4. **Evaluate agreement.** For each edit and each observation, check it
   against the codebase and this session's own understanding of the plan:
   - Is the evaluator's claim about the codebase correct?
   - Do the plan edits preserve the original intent?
   - Were any observations resolved in that conversation, and how?
   - Is anything the evaluator flagged actually wrong, or anything it
     missed?

5. **Respond with concerns and follow-ups.** State plainly which points are
   agreed and understood (briefly), then give detail only on disagreements,
   concerns, and follow-up questions. If still in Plan mode, fold accepted
   changes into the plan rather than editing code.

## Response Format

- Lead with a one-line summary: which conversation was consumed and the
  overall stance (in agreement / in agreement with concerns / disagreements).
- **Accepted**: brief list of evaluator points that are understood and agreed.
- **Concerns / disagreements**: numbered, each with the evaluator's claim,
  this model's counterpoint with evidence, and a proposed resolution.
- **Follow-ups**: open questions for the user, if any.
- No emojis.
