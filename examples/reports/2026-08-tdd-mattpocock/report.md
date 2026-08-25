# Evaluation Report: tdd (mattpocock/skills) — Third-Party Empirical Test

> **Verdict: `INCONCLUSIVE`** (reliability: low)
> Three independent test rounds measured Δ pass rate of **−11pp, 0pp, −11pp** against baseline. The effect signal is smaller than run-to-run variance — we cannot distinguish this skill's effect from noise, and we won't pretend otherwise.

---

## 1. Skill information

| Field | Value |
|---|---|
| Skill | `tdd` |
| Source | [mattpocock/skills](https://github.com/mattpocock/skills) — "Skills for Real Engineers" |
| Popularity context | One of the most-installed engineering skills (~759k installs on skills.sh at test time) |
| Format | agentskills.io SKILL.md + references (tests.md, mocking.md) |

Popularity is exactly why it was tested first: if install counts were evidence, this skill would be the safest bet in the ecosystem. It wasn't.

## 2. Test environment

| Field | Value |
|---|---|
| Evaluator | AI-Skill-Evaluator @ commit `0323f16` line (V0.1 + Phase 6.2 calibration) |
| Test dates | R1: 2026-08-25 · R2: 2026-08-25 · R3: 2026-08-25 |
| Target model | `auto` via local OpenAI-compatible gateway |
| Judge model | `auto` (same gateway), temperature 0 |
| Runs × evals | 3 × 3 per mode |
| Baseline | enabled (`with_skill` vs `without_skill`) |

## 3. Method

Three self-authored eval cases (not official evals from the skill author — none were published):

1. **test-first-maxvalue** — walk through building a function test-first; checks strict red-green ordering and edge-case coverage
2. **regression-tests** — given a buggy `slugify()`, write regression tests before fixing; checks the tests expose the single-replace bug
3. **mock-strategy** — email-sending function testing approach; checks mock-vs-real-SMTP reasoning

Each eval ran twice per round (`with_skill`: SKILL.md injected as system context; `without_skill`: empty system), graded by an LLM judge against fixed assertions with mandatory evidence citations.

Full eval definitions: [`evals.json`](./evals.json). Reproduction command in §10.

## 4. Six-dimension result (final round)

| Dimension | Score |
|---|---|
| Capability | 78 |
| Lift | **n/a** (inconclusive) |
| Cost | 100 |
| Speed | 100 |
| Stability | 0 |
| Security | 100 |
| **Overall** | **57.3** — `INCONCLUSIVE`, reliability: **low** |

Lift is `n/a`, not zero-scored: when a result is within the noise band, reporting a lift number would manufacture false precision.

## 5. Multi-round comparison

| Round | With-skill pass rate | Baseline pass rate | Δ pass rate | Verdict path |
|---|---|---|---|---|
| R1 | 77.8% ± 31.4 | 88.9% | **−11.1pp** | pre-I4 rules → CAUTION |
| R2 | 88.9% ± 15.7 | 88.9% | **0pp** | I2 → INCONCLUSIVE |
| R3 | 77.8% ± 31.4 | 88.9% | **−11.1pp** | **I4 noise band → INCONCLUSIVE** |

The Δ swung between −11pp and 0pp across three identical configurations. Under our calibrated noise band (±15pp, derived from exactly this kind of cross-run swing), all three rounds fall inside it.

**Token overhead**: the skill consistently cost ~+750 tokens per run (context injection) with no measurable capability return in these tasks.

## 6. Why this isn't just a score

A single-round snapshot would have produced three different stories: "slightly harmful" (R1), "no effect" (R2), "harmful again" (R3). Any of those alone would be misleading.

The honest answer is that on this task set, the tdd skill's effect — positive or negative — is smaller than the natural variance of the model+judge system. Our INCONCLUSIVE gates exist precisely so we say *"we can't tell"* instead of manufacturing a number. A tool that always gives an answer is a horoscope; a tool that sometimes says "insufficient signal" can be trusted when it does give one.

This is not a defense of the skill either: two of three rounds trended negative. If anything, the burden of proof now sits with the skill to demonstrate value under better-controlled conditions.

## 7. Understanding INCONCLUSIVE

`INCONCLUSIVE` means: *on these tasks, with this model, at this sample size, the effect cannot be distinguished from run variance.* It does **not** mean:

- the skill is bad (R2 showed parity, not harm),
- TDD is bad,
- or the tool failed.

It means our measurement cannot resolve the question. More runs, harder tasks aligned with the skill's strengths, or an official eval set from the author could change this — we'd gladly re-run.

## 8. Cost analysis (final round)

| Item | USD | Tokens |
|---|---|---|
| skill_cost (with_skill target calls) | $0.0105 | 4,465 |
| eval_overhead — judge | $0.0114 | 7,211 |
| eval_overhead — baseline | $0.0089 | 2,328 |
| **total_eval_cost** | **$0.0309** | — |

Note the judge consumed more tokens than the skill itself did — measuring costs money too. Per-run skill overhead was ~+712 tokens vs baseline.

## 9. Limitations

1. **Single judge model family** — LLM-as-judge variance exists; results may shift with a different judge.
2. **Self-authored tasks** — these evals were written by us, not the skill author. They may not exercise the skill's strongest use cases.
3. **Sample size** — 9 target runs per mode across 3 rounds; sufficient to detect gross effects, not fine ones.
4. **One gateway/model configuration** — results may differ on other models.
5. The skill's references (tests.md, mocking.md) were included, but Claude Code-specific features (hooks, plugin context) were not reproduced.

## 10. Reproduce it

```bash
git clone https://github.com/feng520go1978/AI-Skill-Evaluator.git
cd AI-Skill-Evaluator && npm install && npm run build

node dist/cli.js ./testbed/tdd \
  --workspace ./my-results --baseline --runs 3 --concurrency 1 \
  --target <model> --judge <model-or-same> \
  --base-url https://api.openai.com/v1 \
  --api-key-env OPENAI_API_KEY --report
```

Raw artifacts for all three rounds: [`results/`](../../../results/tdd/iteration-1/), [`results-r2/`](../../../results-r2/tdd/iteration-1/), [`results-r3/`](../../../results-r3/tdd/iteration-1/) — every `grading.json` contains the judge's full evidence chain.

---

*Tested with AI-Skill-Evaluator. If you're the skill author and believe these tasks undersell your work: open an issue with better evals and we'll re-run at higher sample size, publishing whatever comes out.*
