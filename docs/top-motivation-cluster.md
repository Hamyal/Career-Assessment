# Top Motivation Cluster — Options & Current Implementation

The report generator expects `top_motivation_cluster` in the scoring output. Here are options and what is implemented.

---

## Current implementation (in code)

**Derive from primary archetype.** The scoring engine sets `top_motivation_cluster` to a fixed label per primary type:

| Primary | Top motivation cluster label |
|--------|-------------------------------|
| Decoder | Discovery & clarity — Uncovering truths and understanding the big picture. |
| Signal | Innovation & impact — Driving change, bold steps, and authentic expression. |
| Bridge | Connection & empowerment — Helping others thrive and uplifting people. |
| Heartbeat | Excellence & stability — Mastery, recognition, and steady progress. |

- **Pros:** No extra logic, always populated, aligns with Q32/Q37 themes.
- **Cons:** Same for everyone with the same primary; not driven by a specific “motivation” question.

---

## Alternative approaches (if you want to change later)

### 1. Use Q37 “Your prime motivation is…” only

- Take the **selected option(s)** for question 37 (e.g. “Driving change”, “Uplifting others”).
- Set `top_motivation_cluster` to that option label (or the first if multi-select).
- **Pros:** Directly from one motivation question. **Cons:** Need to pass responses into the scoring step or a post-step that reads Q37.

### 2. Use Q32 + Q37 and pick the “winning” cluster

- Define clusters (e.g. use Q37 option labels as cluster names).
- For Q32 and Q37, map each selected option to a cluster; count which cluster was selected most.
- Set `top_motivation_cluster` to that cluster name.
- **Pros:** Uses two motivation questions. **Cons:** More logic and a clear rule for ties.

### 3. Keep archetype-based but customize labels

- Same as current implementation, but edit the four strings in `src/lib/scoring/engine.ts` (`MOTIVATION_CLUSTER_BY_ARCHETYPE`) to match your exact wording or product language.

### 4. Blended label (primary + secondary)

- When `is_blended` is true, set `top_motivation_cluster` to a combo, e.g. “Innovation & impact + Connection & empowerment”.
- Otherwise keep the primary-only label as now.

---

## Where it appears

- **JSON:** Included in the payload sent to the AI for the report narrative (`toReportGeneratorJson`).
- **PDF:** Shown on the cover under “Primary · Secondary” as “Top motivation cluster” and the label text.

To change behavior, edit `MOTIVATION_CLUSTER_BY_ARCHETYPE` and/or the logic in `computeFinalOutput` in `src/lib/scoring/engine.ts`.
