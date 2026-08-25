# Contributing to AI-Skill-Evaluator

Thanks for your interest in improving AI-Skill-Evaluator! This tool exists to make Agent Skill quality claims *empirically testable* — contributions that sharpen that mission are welcome.

## Ground rules

1. **Evidence over vibes.** Changes to scoring, verdict gates, or noise-band thresholds must cite real run data (before/after on the same skill+tasks), not intuition.
2. **No scope creep in PRs.** One logical change per PR. New features need an issue discussion first.
3. **Don't game the verdicts.** Anything that makes PASS easier to obtain (loosening gates, hiding INCONCLUSIVE) will be rejected unless backed by validation data.

## Development setup

```bash
git clone https://github.com/feng520go1978/AI-Skill-Evaluator.git
cd AI-Skill-Evaluator
npm install          # Node >= 18
npm run build        # tsc, zero errors required
npm test             # all tests must pass (35 at time of writing)
```

## Before opening a PR

- [ ] `npm run build` passes with zero errors
- [ ] `npm test` passes — add tests for any behavior change
- [ ] Scoring/threshold changes include before/after evidence on at least one real skill
- [ ] README updated if user-facing behavior changed
- [ ] PROJECT_STATE.md phase ledger touched only if the change affects project status

## Code layout

```
src/
├── pricing.ts      # model price table + cost calculation
├── scoring.ts      # six-dimension engine, verdicts, INCONCLUSIVE gates
├── security.ts     # static security tripwire rules
├── grade.ts        # LLM judge + deterministic tool assertions
├── run-eval.ts     # single-eval execution (with/without modes)
├── evaluate-skills.ts  # orchestrator (concurrency pool, phases)
└── ...
```

## Reporting bugs

Open an issue with:
- The command you ran (redact API keys!)
- `benchmark.json` and `score.json` from the workspace
- What you expected vs what happened

## Reporting security issues

If a finding relates to the security scanner itself (bypasses, false-negative patterns), please open a **private security advisory** rather than a public issue.

## License

By contributing, you agree your contributions are licensed under MIT alongside the existing code.
