# AI-Skill-Evaluator

**Find out — empirically — whether an AI Agent Skill actually works.**

AI-Skill-Evaluator is a test runner for [Agent Skills](https://agentskills.io) (SKILL.md folders) that grades each skill on **six weighted dimensions** and issues a verdict: `PASS`, `CAUTION`, `FAIL`, or `INCONCLUSIVE`.

It answers the question every skill user has but no leaderboard can: *"Is this worth installing, and what does it really cost?"*

## Why

Agent Skills have exploded (100k+ star repos, million-scale install counts), but popularity is not evidence:

- Academic evaluation ([SkillsBench](https://arxiv.org/abs/2602.12670), 2026) found curated skills improve pass rates by only +16pp on average — and **16 of 84 tasks got *worse*** with a skill installed.
- Install-count leaderboards rank by popularity, never by measured effect.
- Nothing tells you the token cost, time overhead, or security risk of a skill before you depend on it.

AI-Skill-Evaluator runs your skill against real tasks with and without the skill loaded, grades both outputs with an LLM judge, and shows you the actual lift — or its absence.

## Core capabilities

| Capability | What you get |
|---|---|
| **Baseline comparison** | Every eval runs twice — `with_skill` vs `without_skill` — so you see the true delta |
| **Six-dimension score** | Capability 35% / Lift 25% / Cost 10% / Speed 10% / Stability 10% / Security 10% → 0–100 overall + verdict |
| **Real cost accounting** | Token spend priced from a local table (API-reported costs win when present); unknown models flagged `estimated` |
| **Three-way cost split** | `skill_cost` (running it) / `eval_overhead` (judge + baseline) / `total_eval_cost` |
| **Stability testing** | `--runs N` repeats each eval; pass-rate stddev feeds the stability dimension |
| **Security scan** | Regex tripwire over SKILL.md/scripts/references: secrets, exfiltration endpoints, destructive commands, injection phrasing — a critical finding forces FAIL |
| **Honest inconclusiveness** | Four INCONCLUSIVE gates (baseline near-perfect / no sensitivity / undersampled / effect-within-noise-band) prevent false confidence from easy tasks |
| **Portable artifacts** | JSON + JSONL all the way down; static HTML report; `score.json` for dashboards |

## Verdict model

```
PASS          overall ≥ 70
CAUTION       50–69, or Δlift ≤ −20pp
FAIL          overall ≤ 50, Δlift ≤ −30pp, or any CRITICAL security finding
INCONCLUSIVE  baseline ≥90% & Δ≤5% · zero sensitivity · <6 samples · |Δ|≤15pp noise band
```

The INCONCLUSIVE gates are calibrated from repeated real-world runs: the same skill+tasks measured **Δ = −11pp then Δ = 0pp** across two identical sessions — small deltas on unstable baselines are indistinguishable from noise, and pretending otherwise is how false conclusions happen.

## Quickstart

```bash
npm install && npm run build   # Node >= 18

export OPENAI_API_KEY=sk-...   # any OpenAI-compatible endpoint works
node dist/cli.js ./my-skill \
  --baseline --runs 3 \
  --target gpt-4o-mini --judge gpt-4o-mini \
  --base-url https://api.openai.com/v1 \
  --report
```

Your skill folder needs a `SKILL.md` plus an `evals/evals.json` describing test cases:

```json
{
  "skill_name": "my-skill",
  "evals": [
    {
      "id": 1,
      "name": "basic",
      "prompt": "Summarize this data.",
      "expected_output": "Identifies the peak month.",
      "assertions": ["Output names the highest-revenue month"]
    }
  ]
}
```

Results land in `agent-skills-workspace/`: per-run `grading.json`/`timing.json` (with `judge_cost_usd`), rolled-up `benchmark.json` (mean/stddev/delta), six-dimension `score.json` with `evaluation_cost`, and a static HTML report.

### Example verdict output

```json
{
  "skill": "my-skill",
  "dimensions": { "capability": 89, "lift": 73, "cost": 91,
                  "speed": 100, "stability": 37, "security": 100 },
  "overall": 82.2,
  "verdict": "PASS",
  "evaluation_cost": {
    "skill_cost":    { "usd": 0.0171 },
    "eval_overhead": { "judge_usd": 0.0134, "baseline_usd": 0.0116 },
    "total_eval_cost": { "usd": 0.0421 }
  }
}
```

## Validation

The scoring system was validated over three rounds of real-skill testing (four popular skills × with/without × 3 repetitions):

- A genuinely effective skill held **PASS across all three rounds** (+22pp lift every round)
- A weak/noise-level skill converged to **INCONCLUSIVE** after swinging between −11pp and 0pp
- An over-hyped skill whose tasks were too easy was correctly gated to **INCONCLUSIVE** instead of a false high score
- A negative-effect round was caught as **FAIL**, with judge evidence to back it

See [`docs/`](docs/) for the full phase reports and methodology.

## Roadmap

- [ ] Radar-chart rendering in the HTML report
- [ ] Markdown report export (for sharing/reviews)
- [ ] Seed task library (tasks pre-filtered for baseline difficulty)
- [ ] MCP server evaluation support
- [ ] Multi-judge consensus mode
- [ ] Public leaderboard of evaluated skills

## Known limitations

- Single-judge grading (LLM-as-judge variance exists; use temperature 0)
- The ±15pp noise band makes INCONCLUSIVE common for weak skills — that honesty is the point, but more `--runs` narrows it
- Visual/design skills are judged on text descriptions only

## License & credits

Built on [agent-skills-eval](https://github.com/darkrishabh/agent-skills-eval) by Rishabh Mehan (MIT). The upstream runner — skill discovery, baseline comparison harness, LLM judge, artifact layout — is reused here under its MIT license; scoring, pricing, security scanning, and the validation methodology are new in this fork. See [LICENSE](LICENSE).

Skill scoring weights adapted from concepts in [Evol-ai/SkillCompass](https://github.com/Evol-ai/SkillCompass) (MIT).
