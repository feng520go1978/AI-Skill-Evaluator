// Static security scanning for Agent Skills (heuristic, regex-based).
//
// Scans SKILL.md, references/, and scripts/ for patterns associated with
// common agent-skill attack classes: secret leakage, data exfiltration,
// destructive commands, and prompt-injection overrides. This is a tripwire,
// not a sandbox — findings are advisory in V0.1 except `critical`, which
// gates the overall verdict to FAIL (see scoring.ts).

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import type { SecurityFinding } from "./scoring.js";

interface Rule {
  id: string;
  severity: SecurityFinding["severity"];
  pattern: RegExp;
  description: string;
}

const RULES: Rule[] = [
  // ── secrets & credentials ────────────────────────────────────────────────
  { id: "api-key-literal", severity: "high", pattern: /\b(sk|pk_live|pk_test|rk)_[A-Za-z0-9]{16,}\b/, description: "possible API key literal" },
  { id: "aws-key", severity: "critical", pattern: /AKIA[0-9A-Z]{16}/, description: "AWS access key id" },
  { id: "private-key-block", severity: "critical", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, description: "embedded private key" },
  { id: "bearer-token", severity: "medium", pattern: /[Bb]earer\s+[A-Za-z0-9\-_.~+/]{20,}/, description: "hardcoded bearer token" },
  { id: "env-secret-read", severity: "low", pattern: /(API_KEY|SECRET|PASSWORD|TOKEN)\s*[=:]\s*["'][^"'$\s{]{8,}["']/, description: "possible hardcoded credential assignment" },

  // ── exfiltration ─────────────────────────────────────────────────────────
  { id: "exfil-webhook", severity: "high", pattern: /(webhook\.site|requestbin|pipedream\.net|ngrok\.(io|app)|interact\.sh)/i, description: "known exfiltration/webhook endpoint" },
  { id: "post-env-to-url", severity: "critical", pattern: /curl[^|]*(-d|--data)[^|]*\$(\{)?(env|ENVIRONMENT)?\b.*(KEY|TOKEN|SECRET)/i, description: "posts environment/credential material to a URL" },
  { id: "raw-ip-endpoint", severity: "medium", pattern: /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, description: "raw-IP endpoint (common in covert exfil)" },

  // ── destructive commands ─────────────────────────────────────────────────
  { id: "destructive-rm", severity: "high", pattern: /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+|-[a-zA-Z]*r[a-zA-Z]*f)([^|]*)(\/|\*|~|\$HOME)/, description: "recursive force delete of broad paths" },
  { id: "disk-wipe", severity: "critical", pattern: /\b(mkfs|dd\s+if=\/dev\/(zero|random)\s+of=\/dev\/[sh]d)/, description: "disk wipe command" },
  { id: "reverse-shell", severity: "critical", pattern: /(bash\s+-i\s+>&\s*\/dev\/tcp\/|nc\s+-e\s+\/bin\/(ba)?sh)/, description: "reverse shell one-liner" },

  // ── prompt-injection style overrides ────────────────────────────────────
  { id: "override-instructions", severity: "medium", pattern: /(ignore|disregard|forget)\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i, description: "instruction-override phrasing" },
  { id: "hide-behavior", severity: "medium", pattern: /(do not|don't)\s+(tell|inform|mention|reveal).*(user|human)/i, description: "concealment directive aimed at the user" },
];

function* walkFiles(root: string): Generator<string> {
  if (!existsSync(root)) return;
  const stat = statSync(root);
  if (stat.isFile()) {
    yield root;
    return;
  }
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full);
    else if (entry.isFile()) yield full;
  }
}

/**
 * Scan a skill directory. Returns findings sorted by severity
 * (critical first). Each finding includes the file and line number.
 */
export function scanSkillSecurity(skillDir: string): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  for (const filePath of walkFiles(skillDir)) {
    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      continue; // binary or unreadable — skip
    }
    // skip very large files (likely fixtures/data, not instructions)
    if (content.length > 512 * 1024) continue;

    const relPath = path.relative(skillDir, filePath);
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      for (const rule of RULES) {
        // fresh regex per line to avoid lastIndex issues with /g flags
        if (new RegExp(rule.pattern.source, rule.pattern.flags).test(lines[i])) {
          findings.push({
            severity: rule.severity,
            rule: rule.id,
            detail: `${relPath}:${i + 1} — ${rule.description}: ${lines[i].trim().slice(0, 120)}`,
          });
        }
      }
    }
  }
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  return findings.sort((a, b) => order[a.severity] - order[b.severity]);
}
