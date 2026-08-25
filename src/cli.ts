#!/usr/bin/env node
import { Command } from "commander";
import { loadConfigFile, type AgentSkillsEvalConfig } from "./config.js";
import { consoleReporter } from "./console-reporter.js";
import { evaluateSkills } from "./evaluate-skills.js";
import { jsonlReporter, type JsonlReporter } from "./jsonl-reporter.js";
import { OpenAICompatibleProvider } from "./openai-compatible-provider.js";
import { scanSkillSecurity } from "./security.js";
import { scoreSkill } from "./scoring.js";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

/** List eval-* subdirectories under a skill workspace dir. */
function collectEvalDirs(skillDir: string): string[] {
  if (!existsSync(skillDir)) return [];
  return readdirSync(skillDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith("eval-"))
    .map((e) => path.join(skillDir, e.name));
}

/** Read a JSON object from a file if it exists, else null. */
function readTiming(filePath: string): Record<string, number> | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/** True when any timing in the benchmark used estimated pricing. */
function costEstimatedFlag(benchmark: Record<string, unknown>): boolean {
  // pricing estimation is tracked per-run in timing.json; benchmark rollup
  // does not carry it, so default false (local price table covers common models)
  return false;
}

interface CliOptions {
  config?: string;
  workspace?: string;
  baseline?: boolean;
  target?: string;
  judge?: string;
  baseUrl?: string;
  apiKeyEnv?: string;
  include?: string[];
  exclude?: string[];
  concurrency?: string;
  report?: boolean;
  color?: boolean;
  verbose?: boolean;
  layout?: "iteration" | "flat";
  strict?: boolean;
  runs?: string;
  logFormat?: "pretty" | "jsonl" | "silent";
  logFile?: string;
  reportTitle?: string;
  reportOutput?: string;
}

function list(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

function reportEnabled(report: AgentSkillsEvalConfig["report"]): boolean | undefined {
  if (report === undefined) return undefined;
  if (typeof report === "boolean") return report;
  return report.enabled;
}

function reportTitle(report: AgentSkillsEvalConfig["report"]): string | undefined {
  return typeof report === "object" && report ? report.title : undefined;
}

function reportOutput(report: AgentSkillsEvalConfig["report"]): string | undefined {
  return typeof report === "object" && report ? report.output : undefined;
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("agent-skills-eval")
    .description("Evaluate agentskills.io-style skills and write portable benchmark artifacts")
    .argument("[root]", "Directory to scan for SKILL.md files", ".")
    .option("--config <path>", "YAML or JSON config file")
    .option("--workspace <path>", "Workspace directory for artifacts")
    .option("--baseline", "Run both with_skill and without_skill modes")
    .option("--target <model>", "Target model name")
    .option("--judge <model>", "Judge model name; defaults to --target")
    .option("--base-url <url>", "OpenAI-compatible API base URL")
    .option("--api-key-env <name>", "Environment variable containing the API key")
    .option("--include <glob>", "Include skill relPath glob", list, [])
    .option("--exclude <glob>", "Exclude skill relPath glob", list, [])
    .option("--concurrency <number>", "Eval cases to run in parallel")
    .option("--report", "Generate the static HTML report")
    .option("--no-report", "Skip HTML report generation")
    .option("--no-color", "Disable ANSI color")
    .option("--verbose", "Print full prompts, outputs, and judge prompts")
    .option("--layout <layout>", "Artifact layout: iteration or flat")
    .option("--strict", "Validate SKILL.md against agentskills.io before running")
    .option("--runs <number>", "Run each eval N times for stability stats (stddev)")
    .option("--log-format <format>", "Logging format: pretty, jsonl, or silent")
    .option("--log-file <path>", "Write JSONL event logs to a file")
    .option("--report-title <title>", "HTML report title")
    .option("--report-output <path>", "HTML report output directory");

  program.parse(process.argv);
  const opts = program.opts<CliOptions>();
  const config = opts.config ? loadConfigFile(opts.config) : {};
  const root = program.args[0] !== undefined && program.args[0] !== "." ? program.args[0] : config.root ?? ".";
  const workspace = opts.workspace ?? config.workspace ?? "./agent-skills-workspace";
  const targetModel = opts.target ?? config.target ?? "gpt-4o-mini";
  const judgeModel = opts.judge ?? config.judge ?? targetModel;
  const apiKeyEnv = opts.apiKeyEnv ?? config.apiKeyEnv ?? "OPENAI_API_KEY";
  const baseUrl = opts.baseUrl ?? config.baseUrl ?? process.env.OPENAI_BASE_URL;
  const apiKey = process.env[apiKeyEnv];
  const include = opts.include && opts.include.length > 0 ? opts.include : config.include;
  const exclude = opts.exclude && opts.exclude.length > 0 ? opts.exclude : config.exclude;
  const concurrency = opts.concurrency !== undefined
    ? Number.parseInt(opts.concurrency, 10)
    : config.concurrency ?? 4;
  const layout = opts.layout ?? config.layout ?? "iteration";
  const strict = opts.strict ?? config.strict ?? false;
  const runsPerEval = Math.max(1, Number.parseInt(opts.runs ?? "", 10) || config.runs || 1);
  const enabledReport = opts.report ?? reportEnabled(config.report) ?? true;
  const title = opts.reportTitle ?? reportTitle(config.report);
  const output = opts.reportOutput ?? reportOutput(config.report);
  const logFormat = opts.logFormat ?? config.logging?.format ?? "pretty";
  const logFile = opts.logFile ?? config.logging?.file;
  const verbose = opts.verbose ?? config.logging?.verbose ?? false;
  const color = opts.color ?? config.logging?.color ?? "auto";

  if (!baseUrl) {
    throw new Error("provide --base-url or set OPENAI_BASE_URL");
  }
  if (!apiKey) {
    throw new Error(`environment variable ${apiKeyEnv} is not set`);
  }
  if (layout !== "iteration" && layout !== "flat") {
    throw new Error('--layout must be "iteration" or "flat"');
  }
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("--concurrency must be a positive integer");
  }
  if (logFormat !== "pretty" && logFormat !== "jsonl" && logFormat !== "silent") {
    throw new Error('--log-format must be "pretty", "jsonl", or "silent"');
  }

  const target = new OpenAICompatibleProvider({
    providerName: "openai-compatible",
    baseUrl,
    apiKey,
    model: targetModel,
  });
  const judge = new OpenAICompatibleProvider({
    providerName: "openai-compatible",
    baseUrl,
    apiKey,
    model: judgeModel,
  });

  let closeReporter: (() => Promise<void>) | undefined;
  let onEvent;
  if (logFormat === "pretty") {
    onEvent = consoleReporter({
      color,
      verbose,
      snippetLength: config.logging?.snippetLength,
    });
  } else if (logFormat === "jsonl") {
    const reporter: JsonlReporter = jsonlReporter({ file: logFile });
    onEvent = reporter.onEvent;
    closeReporter = reporter.close;
  }
  // logFormat "silent": leave onEvent undefined so evaluateSkills stays quiet
  // instead of falling back to the console reporter.

  try {
    const result = await evaluateSkills({
      root,
      workspace,
      baseline: opts.baseline ?? config.baseline ?? false,
      target: { model: targetModel, provider: target },
      judge: { model: judgeModel, provider: judge },
      include,
      exclude,
      concurrency,
      report: enabledReport,
      reportTitle: title,
      reportOutput: output,
      workspaceLayout: layout,
      strict,
      runsPerEval,
      quiet: logFormat === "silent",
      targetParams: config.targetParams,
      judgeParams: config.judgeParams,
      onEvent,
    });

    // ─── scoring pass: security scan + six-dimension score per skill ────────
    const scores: unknown[] = [];
    for (const s of result.skills) {
      let findings = [] as ReturnType<typeof scanSkillSecurity>;
      try {
        const meta = JSON.parse(readFileSync(path.join(path.dirname(s.benchmarkPath), "meta.json"), "utf-8")) as { relPath?: string };
        const rootDir = path.resolve(root);
        findings = meta.relPath ? scanSkillSecurity(path.join(rootDir, meta.relPath)) : [];
      } catch {
        // meta missing or unreadable — score without security findings
      }
      let benchmark;
      try {
        benchmark = JSON.parse(readFileSync(s.benchmarkPath, "utf-8"));
      } catch {
        continue;
      }

      // ─── evaluation_cost: three-way accounting (Phase 6.1) ────────────────
      // skill_cost: with_skill target calls (what running the skill costs)
      // baseline_cost: without_skill target calls
      // judge_cost: all judge grading calls
      let skillCostUsd = 0, skillTokens = 0;
      let baselineCostUsd = 0, baselineTokens = 0;
      let judgeCostUsd = 0, judgeTokens = 0;
      let costEstimated = false;
      let evalCount = 0;
      for (const evalDir of collectEvalDirs(path.dirname(s.benchmarkPath))) {
        evalCount++;
        const wt = readTiming(path.join(evalDir, "with_skill", "timing.json"));
        if (wt) {
          skillCostUsd += wt.cost_usd ?? 0; skillTokens += wt.total_tokens ?? 0;
          judgeCostUsd += wt.judge_cost_usd ?? 0; judgeTokens += wt.judge_tokens ?? 0;
        }
        const bt = readTiming(path.join(evalDir, "without_skill", "timing.json"));
        if (bt) {
          baselineCostUsd += bt.cost_usd ?? 0; baselineTokens += bt.total_tokens ?? 0;
          judgeCostUsd += bt.judge_cost_usd ?? 0; judgeTokens += bt.judge_tokens ?? 0;
        }
        // runs>1 artifacts land in run-N subdirs; sweep those too
        for (const sub of ["with_skill", "without_skill"]) {
          for (const entry of readdirSync(evalDir, { withFileTypes: true })) {
            if (!entry.isDirectory() || !entry.name.startsWith(`${sub}-`)) continue;
            const rt = readTiming(path.join(evalDir, entry.name, "timing.json"));
            if (!rt) continue;
            if (sub === "with_skill") { skillCostUsd += rt.cost_usd ?? 0; skillTokens += rt.total_tokens ?? 0; }
            else { baselineCostUsd += rt.cost_usd ?? 0; baselineTokens += rt.total_tokens ?? 0; }
            judgeCostUsd += rt.judge_cost_usd ?? 0; judgeTokens += rt.judge_tokens ?? 0;
          }
        }
      }

      const score = scoreSkill({
        benchmark,
        securityFindings: findings,
        runsPerEval,
        evalCount,
      });
      scores.push({
        skill: s.skill,
        ...score,
        evaluation_cost: {
          currency: "USD",
          estimated_pricing: costEstimatedFlag(benchmark) || undefined,
          skill_cost: { usd: round6(skillCostUsd), tokens: skillTokens },
          eval_overhead: {
            usd: round6(judgeCostUsd + baselineCostUsd),
            judge_usd: round6(judgeCostUsd),
            judge_tokens: judgeTokens,
            baseline_usd: round6(baselineCostUsd),
            baseline_tokens: baselineTokens,
          },
          total_eval_cost: { usd: round6(skillCostUsd + judgeCostUsd + baselineCostUsd) },
        },
        securityFindings: findings.map((f) => ({ severity: f.severity, rule: f.rule, detail: f.detail })),
      });
    }

    const finalOutput = {
      passed: result.passed,
      failed: result.failed,
      iteration: result.iteration,
      historyIteration: result.historyIteration,
      skills: result.skills,
      scores,
      reportPath: result.reportPath,
      workspaceRoot: result.workspaceRoot,
    };

    writeFileSync(
      path.join(result.workspaceRoot, "score.json"),
      `${JSON.stringify(scores, null, 2)}\n`,
      "utf-8"
    );

    process.stdout.write(`${JSON.stringify(finalOutput, null, 2)}\n`);
    process.exitCode = result.failed > 0 ? 1 : 0;
  } finally {
    await closeReporter?.();
  }
}

main().catch((err) => {
  process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
