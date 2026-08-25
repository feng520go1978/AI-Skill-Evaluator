# Roadmap

Living document — items move as validation data accumulates. Nothing here is promised; see CHANGELOG for what shipped.

## Near term (community feedback driven)

- [ ] **Radar chart in HTML report** — six-dimension visualization (inline SVG, no deps)
- [ ] **Markdown report export** — shareable verdict cards for reviews/social
- [ ] **Seed task library** — pre-validated eval sets per skill category, filtered so bare-model pass rate lands in the 30–70% discrimination band
- [ ] Fix: `estimated` pricing flag currently not surfaced from timing.json into score.json rollup

## Mid term

- [ ] MCP server evaluation — extend tool-call assertions to live MCP endpoints
- [ ] Multi-judge consensus — 2–3 judges, majority vote on each assertion; report inter-judge agreement as a confidence signal
- [ ] Blind judging mode — judge doesn't know which output is with_skill (removes structural favoritism)
- [ ] Codex / other skill dialects beyond agentskills.io SKILL.md

## Long term / exploratory

- [ ] Public leaderboard of evaluated skills (only with community trust + reproducible runs)
- [ ] Visual-skill evaluation channel (rendered screenshot comparison)
- [ ] CI integration (`ai-skill-eval check` gate for repos shipping skills)

## Non-goals

- SaaS/dashboard hosting — this stays a local-first CLI
- Auto-installing or auto-removing skills based on scores — humans decide
