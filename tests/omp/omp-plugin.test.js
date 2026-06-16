'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const repoRoot = path.resolve(__dirname, '..', '..');
const pkg = require(path.join(repoRoot, 'package.json'));
const toolFactory = require(path.join(repoRoot, 'omp/tools/index.js'));
const extension = require(path.join(repoRoot, 'omp/extension.js'));

let passed = 0;
let failed = 0;
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function schemaStub() {
  const chain = () => ({ optional: chain, default: chain, describe: chain });
  return {
    object: () => chain(),
    string: chain,
    boolean: chain,
    number: chain,
    enum: () => chain(),
  };
}

async function withEnv(overrides, fn) {
  const original = {};
  for (const key of Object.keys(overrides)) {
    original[key] = process.env[key];
    if (overrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = overrides[key];
    }
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function captureExtensionHandlers() {
  const handlers = {};
  extension({
    zod: schemaStub(),
    setLabel() {},
    registerCommand() {},
    on(event, handler) {
      handlers[event] = handler;
    },
  });
  return handlers;
}

function tempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-omp-plugin-'));
}

function sessionDir(cwd) {
  return path.join(cwd, '.ecc', 'omp-session');
}

function createTools(options = {}) {
  return toolFactory({
    cwd: options.cwd || repoRoot,
    zod: schemaStub(),
    exec: options.exec || (async () => ({ code: 0, stdout: '', stderr: '' })),
  });
}

function getTool(tools, name) {
  const tool = tools.find((entry) => entry.name === name);
  assert.ok(tool, `Expected tool ${name}`);
  return tool;
}

function assertEnvelope(result, expectedStatus) {
  assert.ok(result, 'Expected a result object');
  assert.ok(Array.isArray(result.content), 'Expected content array');
  assert.strictEqual(typeof result.content[0].text, 'string');
  assert.ok(result.details, 'Expected details payload');
  assert.strictEqual(result.details.status, expectedStatus);
  assert.strictEqual(typeof result.details.summary, 'string');
  assert.ok(Array.isArray(result.details.next_actions), 'Expected next_actions array');
  assert.ok(Array.isArray(result.details.artifacts), 'Expected artifacts array');
  assert.ok(Object.prototype.hasOwnProperty.call(result.details, 'data'));
  assert.ok(Object.prototype.hasOwnProperty.call(result.details, 'error'));
}

console.log('\n=== Testing OMP plugin adapter ===\n');

test('package manifest exposes OMP runtime adapter paths', () => {
  assert.ok(pkg.omp, 'Expected package.json#omp');
  assert.deepStrictEqual(pkg.omp.extensions, ['./omp/extension.js']);
  assert.deepStrictEqual(pkg.omp.tools, ['./omp/tools/index.js']);
  assert.deepStrictEqual(pkg.omp.commands, ['./commands']);
  assert.ok(!Object.prototype.hasOwnProperty.call(pkg.omp, 'hooks'), 'Expected package.json#omp.hooks to be absent');
  assert.ok(pkg.files.includes('omp/'), 'Expected npm package files to include omp/');
});

test('OMP manifest paths exist', () => {
  for (const entry of [...pkg.omp.extensions, ...pkg.omp.tools, ...pkg.omp.commands]) {
    assert.ok(fs.existsSync(path.join(repoRoot, entry)), `${entry} should exist`);
  }
});

test('tool factory registers seven OMP tools', () => {
  const tools = createTools();
  assert.strictEqual(tools.length, 7);
  assert.deepStrictEqual(tools.map((tool) => tool.name).sort(), [
    'ecc_changed_files',
    'ecc_check_coverage',
    'ecc_format_code',
    'ecc_git_summary',
    'ecc_lint_check',
    'ecc_run_tests',
    'ecc_security_audit',
  ].sort());
});

test('tool factory fails fast without a compatible zod helper', () => {
  assert.throws(
    () => toolFactory({ cwd: repoRoot, exec: async () => ({ code: 0, stdout: '', stderr: '' }) }),
    /compatible zod schema helper/
  );
});

test('OMP tools expose stable observation envelopes', async () => {
  const cwd = tempWorkspace();
  fs.writeFileSync(path.join(cwd, 'package-lock.json'), '{}\n');
  fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ devDependencies: { jest: '^29.0.0' } }, null, 2));
  fs.writeFileSync(path.join(cwd, 'eslint.config.js'), 'module.exports = [];');

  const tools = createTools({
    cwd,
    exec: async (_command, args) => {
      const key = args.join(' ');
      if (key === 'branch --show-current') return { code: 0, stdout: 'main\n', stderr: '' };
      if (key === 'status --short') return { code: 0, stdout: ' M package.json\n', stderr: '' };
      if (key === 'log --oneline -5') return { code: 0, stdout: 'abc123 test commit\n', stderr: '' };
      if (key === 'diff --cached --stat') return { code: 0, stdout: '', stderr: '' };
      if (key === 'diff main...HEAD --stat') return { code: 0, stdout: ' package.json | 1 +\n', stderr: '' };
      return { code: 1, stdout: '', stderr: `unexpected exec call: ${key}` };
    },
  });

  const runTests = await getTool(tools, 'ecc_run_tests').execute('1', { coverage: true }, null, { cwd });
  assertEnvelope(runTests, 'success');
  assert.match(runTests.details.data.command, /^npm run test -- --coverage$/);

  const coverage = await getTool(tools, 'ecc_check_coverage').execute('2', { threshold: 80 }, null, { cwd });
  assertEnvelope(coverage, 'warning');

  const audit = await getTool(tools, 'ecc_security_audit').execute('3', { type: 'code' }, null, { cwd });
  assertEnvelope(audit, 'success');

  const format = await getTool(tools, 'ecc_format_code').execute('4', { filePath: 'src/example.js' }, null, { cwd });
  assertEnvelope(format, 'success');

  const lint = await getTool(tools, 'ecc_lint_check').execute('5', { target: 'src' }, null, { cwd });
  assertEnvelope(lint, 'success');

  const git = await getTool(tools, 'ecc_git_summary').execute('6', { baseBranch: 'main', depth: 5 }, null, { cwd });
  assertEnvelope(git, 'success');

  const changed = await getTool(tools, 'ecc_changed_files').execute('7', { format: 'json' }, null, { cwd });
  assertEnvelope(changed, 'success');
});

test('coverage parse failures return structured error envelopes', async () => {
  const cwd = tempWorkspace();
  fs.mkdirSync(path.join(cwd, 'coverage'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'coverage', 'coverage-summary.json'), '{not-json');
  const tools = createTools({ cwd });
  const result = await getTool(tools, 'ecc_check_coverage').execute('8', { threshold: 80 }, null, { cwd });
  assertEnvelope(result, 'error');
  assert.match(result.details.summary, /could not be parsed/);
});

test('git summary rejects invalid base branches with a structured error envelope', async () => {
  const tools = createTools({ cwd: repoRoot });
  const result = await getTool(tools, 'ecc_git_summary').execute('9', { baseBranch: '../bad' }, null, { cwd: repoRoot });
  assertEnvelope(result, 'error');
  assert.match(result.details.summary, /Invalid baseBranch/);
});

test('extension registers all markdown commands and core hook events', () => {
  const commands = [];
  const events = [];
  const pi = {
    zod: schemaStub(),
    setLabel(label) { assert.strictEqual(label, 'ECC for OMP'); },
    registerCommand(name, definition) {
      commands.push({ name, definition });
      assert.ok(definition.description, `${name} should have description`);
      assert.strictEqual(typeof definition.handler, 'function');
    },
    on(event, handler) {
      events.push(event);
      assert.strictEqual(typeof handler, 'function');
    },
  };
  extension(pi);
  const commandFiles = fs.readdirSync(path.join(repoRoot, 'commands')).filter((file) => file.endsWith('.md'));
  assert.strictEqual(commands.length, commandFiles.length);
  for (const event of ['session_start', 'tool_call', 'tool_result', 'session_before_compact', 'turn_end', 'session_shutdown']) {
    assert.ok(events.includes(event), `Expected event ${event}`);
  }
});

test('lifecycle handlers do not create state files without opt-in env gates', async () => {
  await withEnv({ ECC_OMP_METRICS: undefined, ECC_OMP_SESSION_MARKERS: undefined, ECC_HOOK_PROFILE: undefined }, async () => {
    const cwd = tempWorkspace();
    const handlers = captureExtensionHandlers();
    await handlers.session_start({}, { cwd, ui: { notify() {} } });
    await handlers.session_before_compact({}, { cwd });
    await handlers.turn_end({}, { cwd });
    await handlers.session_shutdown({}, { cwd });
    assert.strictEqual(fs.existsSync(sessionDir(cwd)), false, 'Expected lifecycle handlers to avoid creating .ecc/omp-session by default');
  });
});

test('lifecycle telemetry and session markers write state only when opted in', async () => {
  await withEnv({ ECC_OMP_METRICS: '1', ECC_OMP_SESSION_MARKERS: '1', ECC_HOOK_PROFILE: undefined }, async () => {
    const cwd = tempWorkspace();
    const handlers = captureExtensionHandlers();
    await handlers.turn_end({}, { cwd });
    await handlers.session_shutdown({}, { cwd });

    const metrics = JSON.parse(fs.readFileSync(path.join(sessionDir(cwd), 'metrics.json'), 'utf8'));
    const lifecycle = fs.readFileSync(path.join(sessionDir(cwd), 'session-lifecycle.jsonl'), 'utf8').trim().split('\n');
    assert.strictEqual(metrics.turns, 1);
    assert.strictEqual(lifecycle.length, 1);
    assert.strictEqual(JSON.parse(lifecycle[0]).event, 'session_shutdown');
  });
});

test('gitignore excludes OMP runtime session state', () => {
  const gitignore = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');
  assert.ok(gitignore.split(/\r?\n/).includes('.ecc/omp-session/'));
});

async function run() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  PASS ${name}`);
      passed++;
    } catch (error) {
      console.log(`  FAIL ${name}`);
      console.log(`    Error: ${error.message}`);
      failed++;
    }
  }

  if (failed > 0) {
    console.log(`\nFailed: ${failed}`);
    process.exit(1);
  }

  console.log(`\nPassed: ${passed}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
