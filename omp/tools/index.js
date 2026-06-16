'use strict';

const fs = require('fs');
const path = require('path');

const MAX_SCAN_FILES = 1500;
const MAX_FILE_BYTES = 256 * 1024;
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.turbo', '.cache', '.venv', 'venv', '__pycache__']);

function textResult(text, details) {
  return { content: [{ type: 'text', text }], details };
}

function jsonResult(value) {
  return textResult(JSON.stringify(value, null, 2), value);
}

function fileExists(cwd, relativePath) {
  try {
    return fs.statSync(path.join(cwd, relativePath)).isFile();
  } catch {
    return false;
  }
}

function detectPackageManager(cwd) {
  if (fileExists(cwd, 'bun.lockb') || fileExists(cwd, 'bun.lock')) return 'bun';
  if (fileExists(cwd, 'pnpm-lock.yaml')) return 'pnpm';
  if (fileExists(cwd, 'yarn.lock')) return 'yarn';
  if (fileExists(cwd, 'package-lock.json')) return 'npm';
  return 'npm';
}

function readPackageJson(cwd) {
  try {
    return JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
}

function detectTestFramework(cwd) {
  const pkg = readPackageJson(cwd);
  if (!pkg) return 'unknown';
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  if (deps.vitest) return 'vitest';
  if (deps.jest) return 'jest';
  if (deps.mocha) return 'mocha';
  if (deps.ava) return 'ava';
  if (deps.tap) return 'tap';
  return 'unknown';
}

function shellQuote(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:=@+-]+$/.test(text)) return text;
  return `'${text.replace(/'/g, `'"'"'`)}'`;
}

function detectFormatter(cwd, filePath, override) {
  if (override) return override;
  const ext = path.extname(filePath).slice(1).toLowerCase();
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'scss', 'md', 'yaml', 'yml'].includes(ext)) {
    if (fileExists(cwd, 'biome.json') || fileExists(cwd, 'biome.jsonc')) return 'biome';
    return 'prettier';
  }
  if (['py', 'pyi'].includes(ext)) return 'black';
  if (ext === 'go') return 'gofmt';
  if (ext === 'rs') return 'rustfmt';
  return null;
}

function formatterCommand(formatter, filePath) {
  const target = shellQuote(filePath);
  if (formatter === 'biome') return `npx @biomejs/biome format --write ${target}`;
  if (formatter === 'prettier') return `npx prettier --write ${target}`;
  if (formatter === 'black') return `black ${target}`;
  if (formatter === 'gofmt') return `gofmt -w ${target}`;
  if (formatter === 'rustfmt') return `rustfmt ${target}`;
  return null;
}

function detectLinter(cwd, override) {
  if (override) return override;
  if (fileExists(cwd, 'biome.json') || fileExists(cwd, 'biome.jsonc')) return 'biome';
  for (const name of ['.eslintrc.json', '.eslintrc.js', '.eslintrc.cjs', 'eslint.config.js', 'eslint.config.mjs']) {
    if (fileExists(cwd, name)) return 'eslint';
  }
  if (fileExists(cwd, 'pyproject.toml')) {
    let pyproject = '';
    try {
      pyproject = fs.readFileSync(path.join(cwd, 'pyproject.toml'), 'utf8');
    } catch {
      pyproject = '';
    }
    if (pyproject.includes('ruff')) return 'ruff';
  }
  if (fileExists(cwd, '.golangci.yml') || fileExists(cwd, '.golangci.yaml')) return 'golangci-lint';
  return 'eslint';
}

function linterCommand(linter, target, fix) {
  const quoted = shellQuote(target || '.');
  if (linter === 'biome') return `npx @biomejs/biome lint${fix ? ' --write' : ''} ${quoted}`;
  if (linter === 'eslint') return `npx eslint${fix ? ' --fix' : ''} ${quoted}`;
  if (linter === 'ruff') return `ruff check${fix ? ' --fix' : ''} ${quoted}`;
  if (linter === 'pylint') return `pylint ${quoted}`;
  if (linter === 'golangci-lint') return `golangci-lint run ${quoted}`;
  return null;
}

function coverageSummaryFromNyC(data) {
  const files = [];
  let covered = 0;
  let total = 0;
  for (const [file, entry] of Object.entries(data || {})) {
    const statements = entry.s || {};
    const count = Object.keys(statements).length;
    const hit = Object.values(statements).filter((value) => Number(value) > 0).length;
    if (count > 0) {
      files.push({ file, percentage: Math.round((hit / count) * 10000) / 100 });
      covered += hit;
      total += count;
    }
  }
  return { total: { percentage: total ? Math.round((covered / total) * 10000) / 100 : 0, covered, total }, files };
}

function coverageSummary(data) {
  if (data && data.total) {
    const pct = data.total.lines?.pct ?? data.total.statements?.pct ?? data.total.branches?.pct ?? data.total.functions?.pct ?? 0;
    const files = Object.entries(data)
      .filter(([key, value]) => key !== 'total' && value && typeof value === 'object')
      .map(([file, value]) => ({ file, percentage: value.lines?.pct ?? value.statements?.pct ?? value.branches?.pct ?? value.functions?.pct ?? 0 }));
    return { total: { percentage: pct }, files };
  }
  return coverageSummaryFromNyC(data);
}

function walkFiles(root, visitor) {
  let seen = 0;
  function walk(dir) {
    if (seen >= MAX_SCAN_FILES) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (seen >= MAX_SCAN_FILES) return;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(fullPath);
      } else if (entry.isFile()) {
        seen += 1;
        visitor(fullPath);
      }
    }
  }
  walk(root);
  return seen;
}

function scanForSecrets(cwd) {
  const findings = [];
  const patterns = [
    ['OpenAI-style token', /sk-[A-Za-z0-9_-]{20,}/g],
    ['GitHub token', /gh[pousr]_[A-Za-z0-9_]{20,}/g],
    ['AWS access key', /AKIA[0-9A-Z]{16}/g],
    ['Private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
  ];
  walkFiles(cwd, (file) => {
    let stat;
    try { stat = fs.statSync(file); } catch { return; }
    if (stat.size > MAX_FILE_BYTES) return;
    const ext = path.extname(file).toLowerCase();
    if (!['.js', '.ts', '.tsx', '.jsx', '.json', '.env', '.yml', '.yaml', '.toml', '.md', '.py', '.rs', '.go', '.java', '.kt', '.sh'].includes(ext) && !path.basename(file).startsWith('.env')) return;
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch { return; }
    for (const [kind, pattern] of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) findings.push({ kind, file: path.relative(cwd, file) });
    }
  });
  return findings.slice(0, 100);
}

function scanCodeSecurity(cwd) {
  const findings = [];
  const rules = [
    ['shell-string-exec', /\b(exec|execSync)\s*\(\s*`|\b(exec|execSync)\s*\(\s*['"]/],
    ['dangerous-eval', /\beval\s*\(/],
    ['disabled-tls-verification', /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/],
  ];
  walkFiles(cwd, (file) => {
    let stat;
    try { stat = fs.statSync(file); } catch { return; }
    if (stat.size > MAX_FILE_BYTES) return;
    if (!['.js', '.ts', '.tsx', '.jsx', '.mjs', '.cjs', '.py', '.sh'].includes(path.extname(file).toLowerCase())) return;
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch { return; }
    for (const [rule, pattern] of rules) {
      if (pattern.test(text)) findings.push({ rule, file: path.relative(cwd, file) });
    }
  });
  return findings.slice(0, 100);
}

function readChangedFiles(cwd, filter) {
  const file = path.join(cwd, '.ecc', 'omp-session', 'changed-files.json');
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const files = Array.isArray(parsed.files) ? parsed.files : [];
    return filter && filter !== 'all' ? files.filter((entry) => entry.changeType === filter) : files;
  } catch {
    return [];
  }
}

function makeTools(pi) {
  const z = pi.zod?.z || pi.zod;
  const cwdOf = (ctx) => ctx?.cwd || pi.cwd || process.cwd();

  return [
    {
      name: 'ecc_run_tests',
      label: 'ECC Run Tests',
      description: 'Detect package manager and test framework, then return the exact test command to run.',
      parameters: z.object({
        pattern: z.string().optional(),
        coverage: z.boolean().optional(),
        watch: z.boolean().optional(),
        updateSnapshots: z.boolean().optional(),
      }),
      async execute(_id, params, _onUpdate, ctx) {
        const cwd = cwdOf(ctx);
        const packageManager = detectPackageManager(cwd);
        const testFramework = detectTestFramework(cwd);
        const command = [packageManager, packageManager === 'npm' ? 'run test' : 'test'];
        const args = [];
        if (params.coverage) args.push('--coverage');
        if (params.watch) args.push('--watch');
        if (params.updateSnapshots) args.push('-u');
        if (params.pattern) args.push(testFramework === 'jest' || testFramework === 'vitest' ? `--testPathPattern ${shellQuote(params.pattern)}` : shellQuote(params.pattern));
        const fullCommand = `${command.join(' ')}${args.length ? ` ${packageManager === 'npm' ? '-- ' : ''}${args.join(' ')}` : ''}`;
        return jsonResult({ command: fullCommand, packageManager, testFramework, options: params });
      },
    },
    {
      name: 'ecc_check_coverage',
      label: 'ECC Check Coverage',
      description: 'Read common local coverage reports and compare them to a threshold.',
      parameters: z.object({ threshold: z.number().optional(), showUncovered: z.boolean().optional(), format: z.enum(['summary', 'detailed', 'json']).optional() }),
      async execute(_id, params, _onUpdate, ctx) {
        const cwd = cwdOf(ctx);
        const threshold = params.threshold ?? 80;
        const candidates = ['coverage/coverage-summary.json', 'coverage/coverage-final.json', '.nyc_output/coverage.json'];
        for (const candidate of candidates) {
          const full = path.join(cwd, candidate);
          if (!fs.existsSync(full)) continue;
          const summary = coverageSummary(JSON.parse(fs.readFileSync(full, 'utf8')));
          const uncovered = summary.files.filter((entry) => entry.percentage < threshold);
          return jsonResult({ success: summary.total.percentage >= threshold, threshold, coverageFile: candidate, total: summary.total, uncoveredFiles: params.showUncovered === false ? undefined : uncovered });
        }
        return jsonResult({ success: false, error: 'No supported coverage report found', searchedPaths: candidates });
      },
    },
    {
      name: 'ecc_security_audit',
      label: 'ECC Security Audit',
      description: 'Run bounded local secret and code-pattern checks without network access or auto-fix.',
      parameters: z.object({ type: z.enum(['all', 'dependencies', 'secrets', 'code']).optional(), fix: z.boolean().optional(), severity: z.enum(['low', 'moderate', 'high', 'critical']).optional() }),
      async execute(_id, params, _onUpdate, ctx) {
        const cwd = cwdOf(ctx);
        if (params.fix) return jsonResult({ success: false, error: 'Auto-fix is intentionally not supported by the OMP port.' });
        const type = params.type ?? 'all';
        const checks = [];
        if (type === 'all' || type === 'dependencies') checks.push({ name: 'Dependency Vulnerabilities', status: 'manual', command: 'Run npm audit/pnpm audit in a controlled shell if needed.' });
        if (type === 'all' || type === 'secrets') checks.push({ name: 'Secret Detection', status: 'complete', findings: scanForSecrets(cwd) });
        if (type === 'all' || type === 'code') checks.push({ name: 'Code Security Patterns', status: 'complete', findings: scanCodeSecurity(cwd) });
        return jsonResult({ timestamp: new Date().toISOString(), directory: cwd, severity: params.severity ?? 'moderate', checks });
      },
    },
    {
      name: 'ecc_format_code',
      label: 'ECC Format Code',
      description: 'Detect formatter for a file and return the exact command to run.',
      parameters: z.object({ filePath: z.string(), formatter: z.enum(['biome', 'prettier', 'black', 'gofmt', 'rustfmt']).optional() }),
      async execute(_id, params, _onUpdate, ctx) {
        const cwd = cwdOf(ctx);
        const formatter = detectFormatter(cwd, params.filePath, params.formatter);
        const command = formatter && formatterCommand(formatter, params.filePath);
        return jsonResult(command ? { success: true, formatter, command } : { success: false, message: `No formatter detected for ${params.filePath}` });
      },
    },
    {
      name: 'ecc_lint_check',
      label: 'ECC Lint Check',
      description: 'Detect linter for a target path and return a check or fix command.',
      parameters: z.object({ target: z.string().optional(), fix: z.boolean().optional(), linter: z.enum(['biome', 'eslint', 'ruff', 'pylint', 'golangci-lint']).optional() }),
      async execute(_id, params, _onUpdate, ctx) {
        const cwd = cwdOf(ctx);
        const linter = detectLinter(cwd, params.linter);
        return jsonResult({ success: true, linter, command: linterCommand(linter, params.target || '.', Boolean(params.fix)) });
      },
    },
    {
      name: 'ecc_git_summary',
      label: 'ECC Git Summary',
      description: 'Generate a git summary with branch, status, recent commits, and optional diff stats using argv-based execution.',
      parameters: z.object({ depth: z.number().optional(), includeDiff: z.boolean().optional(), baseBranch: z.string().optional() }),
      async execute(_id, params, _onUpdate, ctx, signal) {
        const cwd = cwdOf(ctx);
        const depth = Math.max(1, Math.min(50, Math.floor(params.depth ?? 5)));
        const baseBranch = params.baseBranch || 'main';
        if (!/^[A-Za-z0-9._/@+-]+$/.test(baseBranch)) throw new Error('Invalid baseBranch');
        async function git(args) {
          const result = await pi.exec('git', args, { cwd, signal });
          return result.code === 0 ? result.stdout.trim() : '';
        }
        const summary = { branch: await git(['branch', '--show-current']) || 'unknown', status: await git(['status', '--short']) || 'clean', log: await git(['log', '--oneline', `-${depth}`]) || 'no commits found' };
        if (params.includeDiff !== false) {
          summary.stagedDiff = await git(['diff', '--cached', '--stat']);
          summary.branchDiff = await git(['diff', `${baseBranch}...HEAD`, '--stat']);
        }
        return jsonResult(summary);
      },
    },
    {
      name: 'ecc_changed_files',
      label: 'ECC Changed Files',
      description: 'List files recorded by the ECC OMP extension during this session.',
      parameters: z.object({ filter: z.enum(['all', 'added', 'modified', 'deleted']).optional(), format: z.enum(['tree', 'json']).optional() }),
      async execute(_id, params, _onUpdate, ctx) {
        const files = readChangedFiles(cwdOf(ctx), params.filter || 'all');
        if ((params.format || 'tree') === 'json') return jsonResult({ changed: files.length > 0, files });
        if (!files.length) return textResult('No files changed in this session.', { changed: false, files: [] });
        return textResult(files.map((entry) => `${entry.changeType || 'modified'}\t${entry.path}`).join('\n'), { changed: true, files });
      },
    },
  ];
}

module.exports = makeTools;
module.exports.default = makeTools;
