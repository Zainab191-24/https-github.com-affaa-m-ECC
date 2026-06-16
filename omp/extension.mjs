import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMMANDS_DIR = path.resolve(__dirname, '..', 'commands');
const STATE_DIR_NAME = path.join('.ecc', 'omp-session');

function safeRead(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function stateDir(cwd) {
  return path.join(cwd || process.cwd(), STATE_DIR_NAME);
}

function stateFile(cwd, name) {
  return path.join(stateDir(cwd), name);
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return { data: {}, body: markdown };
  const data = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    }
    data[kv[1]] = value;
  }
  return { data, body: markdown.slice(match[0].length) };
}

function listCommandFiles() {
  try {
    return fs.readdirSync(COMMANDS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => path.join(COMMANDS_DIR, entry.name))
      .sort();
  } catch {
    return [];
  }
}

function normalizeArgs(args) {
  if (typeof args === 'string') return args.trim();
  if (Array.isArray(args)) return args.join(' ').trim();
  if (args && typeof args === 'object') {
    if (typeof args.raw === 'string') return args.raw.trim();
    if (typeof args.input === 'string') return args.input.trim();
    if (typeof args.args === 'string') return args.args.trim();
    return JSON.stringify(args);
  }
  return '';
}

function profile() {
  const value = process.env.ECC_HOOK_PROFILE;
  return value === 'minimal' || value === 'strict' ? value : 'standard';
}

function disabledHooks() {
  return new Set((process.env.ECC_DISABLED_HOOKS || '').split(',').map((item) => item.trim()).filter(Boolean));
}

function hookEnabled(id, required = 'standard') {
  const order = { minimal: 0, standard: 1, strict: 2 };
  if (disabledHooks().has(id)) return false;
  const current = order[profile()] ?? order.standard;
  const requirements = Array.isArray(required) ? required : [required];
  return requirements.some((item) => current >= (order[item] ?? order.standard));
}

function toolNameOf(event) {
  return String(event?.toolName || event?.tool || event?.name || '').toLowerCase();
}

function inputOf(event) {
  return event?.input || event?.args || event?.tool_input || event?.params || {};
}

function commandOf(event) {
  const input = inputOf(event);
  if (typeof input === 'string') return input;
  return String(input.command || input.cmd || '');
}

function filePathOf(event) {
  const input = inputOf(event);
  if (typeof input === 'string') return null;
  const candidate = input.filePath || input.file_path || input.path || input.target || input.filename;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
}

function isEditTool(name) {
  return ['edit', 'write', 'multiedit', 'notebookedit'].includes(name.toLowerCase());
}

function isProtectedConfig(filePath) {
  if (!filePath) return false;
  const base = path.basename(filePath);
  return [
    '.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json',
    'eslint.config.js', 'eslint.config.mjs', 'prettier.config.js', '.prettierrc', '.prettierrc.json',
    'biome.json', 'biome.jsonc', 'tsconfig.json', 'tsconfig.base.json',
    'ruff.toml', 'pyproject.toml', 'Cargo.toml', 'go.mod',
  ].includes(base);
}

function hasShellBypass(command) {
  return /(^|\s)git\s+[^\n]*\s--no-verify(\s|$)/.test(command) || /(^|\s)git\s+[^\n]*\s-n(\s|$)/.test(command);
}

function hasDestructiveShell(command) {
  return /\brm\s+-rf\s+(\/|~|\$HOME|\.\.)/.test(command) || /:\(\)\s*\{\s*:\|:&\s*\}/.test(command);
}

function redact(value) {
  return String(value)
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-***')
    .replace(/gh[pousr]_[A-Za-z0-9_]{8,}/g, 'gh*-***')
    .replace(/AKIA[0-9A-Z]{16}/g, 'AKIA***')
    .replace(/(Authorization:\s*Bearer\s+)[^\s]+/gi, '$1***')
    .slice(0, 5000);
}

function appendJsonLine(cwd, name, entry) {
  try {
    ensureDir(stateDir(cwd));
    fs.appendFileSync(stateFile(cwd, name), `${JSON.stringify(entry)}\n`);
    return true;
  } catch {
    return false;
  }
}

function readJson(cwd, name, fallback) {
  try { return JSON.parse(fs.readFileSync(stateFile(cwd, name), 'utf8')); } catch { return fallback; }
}

function writeJson(cwd, name, value) {
  try {
    ensureDir(stateDir(cwd));
    fs.writeFileSync(stateFile(cwd, name), `${JSON.stringify(value, null, 2)}\n`);
    return true;
  } catch {
    return false;
  }
}

function recordChangedFile(cwd, filePath, changeType) {
  if (!filePath) return;
  const normalized = filePath.split(path.sep).join('/');
  const state = readJson(cwd, 'changed-files.json', { files: [] });
  const files = Array.isArray(state.files) ? state.files : [];
  const existing = files.find((entry) => entry.path === normalized);
  if (existing) {
    existing.changeType = existing.changeType || changeType;
    existing.updatedAt = new Date().toISOString();
  } else {
    files.push({ path: normalized, changeType, updatedAt: new Date().toISOString() });
  }
  writeJson(cwd, 'changed-files.json', { files: files.slice(-500) });
}

function warnConsoleLog(ctx, cwd, filePath) {
  if (!filePath || !/\.(mjs|cjs|js|jsx|ts|tsx)$/.test(filePath)) return;
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  const text = safeRead(fullPath);
  if (!text) return;
  const count = (text.match(/console\.log\s*\(/g) || []).length;
  if (count > 0) ctx?.ui?.notify?.(`[ECC] console.log found in ${filePath} (${count})`, 'warn');
}

function commandPrompt(name, description, body, args) {
  return [
    `Run ECC command /${name}.`,
    description ? `Description: ${description}` : null,
    args ? `User arguments: ${args}` : null,
    '',
    body.trim(),
  ].filter((line) => line !== null).join('\n');
}

function registerCommands(pi) {
  let count = 0;
  for (const file of listCommandFiles()) {
    const markdown = safeRead(file);
    if (!markdown) continue;
    const name = path.basename(file, '.md');
    const parsed = parseFrontmatter(markdown);
    const description = String(parsed.data.description || `Run ECC command /${name}`);
    pi.registerCommand(name, {
      description,
      argumentHint: parsed.data['argument-hint'],
      handler: async (args, ctx) => {
        const argText = normalizeArgs(args);
        const prompt = commandPrompt(name, description, parsed.body, argText);
        if (typeof pi.sendUserMessage === 'function') {
          await pi.sendUserMessage(prompt, { deliverAs: 'followUp' });
        } else if (typeof pi.sendMessage === 'function') {
          await pi.sendMessage(prompt, { deliverAs: 'followUp' });
        } else {
          ctx?.ui?.notify?.(`ECC command /${name} loaded; runtime message injection unavailable.`, 'warn');
        }
      },
    });
    count += 1;
  }
  return count;
}

function extension(pi) {
  pi.setLabel?.('ECC for OMP');
  const commandCount = registerCommands(pi);

  pi.on?.('session_start', async (_event, ctx) => {
    if (hookEnabled('session:start', 'minimal')) {
      ctx?.ui?.notify?.(`[ECC] OMP extension loaded (${commandCount} commands). Profile=${profile()}`, 'info');
    }
  });

  pi.on?.('tool_call', async (event, ctx) => {
    const name = toolNameOf(event);
    const command = commandOf(event);
    const filePath = filePathOf(event);
    const cwd = ctx?.cwd || process.cwd();

    if (hookEnabled('pre:config-protection') && isEditTool(name) && isProtectedConfig(filePath)) {
      return { block: true, reason: `ECC config-protection blocked modification of ${filePath}. Fix source code instead of weakening tool config.` };
    }

    if (name === 'bash') {
      if (hookEnabled('pre:bash:block-no-verify') && hasShellBypass(command)) {
        return { block: true, reason: 'ECC blocked git --no-verify bypass. Fix the failing hook or explicitly disable ECC hook pre:bash:block-no-verify.' };
      }
      if (hookEnabled('pre:bash:destructive-guard', 'strict') && hasDestructiveShell(command)) {
        return { block: true, reason: 'ECC strict profile blocked a destructive shell command.' };
      }
    }

    if (process.env.ECC_GOVERNANCE_CAPTURE === '1' && hookEnabled('pre:governance-capture')) {
      appendJsonLine(cwd, 'governance.jsonl', { phase: 'pre', tool: name, filePath, command: redact(command), at: new Date().toISOString() });
    }

    return undefined;
  });

  pi.on?.('tool_result', async (event, ctx) => {
    const name = toolNameOf(event);
    const filePath = filePathOf(event);
    const cwd = ctx?.cwd || process.cwd();
    if (isEditTool(name) && filePath) {
      recordChangedFile(cwd, filePath, name === 'write' ? 'added' : 'modified');
      if (hookEnabled('post:edit:console-warn')) warnConsoleLog(ctx, cwd, filePath);
    }
    if (process.env.ECC_GOVERNANCE_CAPTURE === '1' && hookEnabled('post:governance-capture')) {
      appendJsonLine(cwd, 'governance.jsonl', { phase: 'post', tool: name, filePath, at: new Date().toISOString() });
    }
    if (process.env.ECC_OBSERVE === '1' && hookEnabled('post:observe:continuous-learning')) {
      appendJsonLine(cwd, 'observations.jsonl', { event: 'tool_result', tool: name, filePath, at: new Date().toISOString() });
    }
    return undefined;
  });

  pi.on?.('session_before_compact', async (_event, ctx) => {
    if (!hookEnabled('pre:compact')) return undefined;
    const cwd = ctx?.cwd || process.cwd();
    const changed = readJson(cwd, 'changed-files.json', { files: [] }).files || [];
    const summary = [
      '# ECC Context (preserve across compaction)',
      '',
      `- OMP extension profile: ${profile()}`,
      `- Registered commands: ${commandCount}`,
      '- Runtime tools are provided by omp/tools/index.js',
      '',
      '## Recently changed files',
      ...(changed.length ? changed.slice(-50).map((entry) => `- ${entry.path} (${entry.changeType})`) : ['- None recorded']),
    ].join('\n');
    return { compaction: { summary, details: { changedFiles: changed.slice(-50) } } };
  });

  pi.on?.('turn_end', async (_event, ctx) => {
    if (process.env.ECC_OMP_METRICS === '1' && hookEnabled('post:ecc-metrics-bridge', 'minimal')) {
      const cwd = ctx?.cwd || process.cwd();
      const metrics = readJson(cwd, 'metrics.json', { turns: 0 });
      metrics.turns = Number(metrics.turns || 0) + 1;
      metrics.updatedAt = new Date().toISOString();
      writeJson(cwd, 'metrics.json', metrics);
    }
  });

  pi.on?.('session_shutdown', async (_event, ctx) => {
    if (process.env.ECC_OMP_SESSION_MARKERS === '1' && hookEnabled('session:end:marker', 'minimal')) {
      appendJsonLine(ctx?.cwd || process.cwd(), 'session-lifecycle.jsonl', { event: 'session_shutdown', at: new Date().toISOString() });
    }
  });
}

export default extension;
