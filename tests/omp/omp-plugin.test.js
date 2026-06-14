'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const pkg = require(path.join(repoRoot, 'package.json'));
const toolFactory = require(path.join(repoRoot, 'omp/tools/index.js'));
const extension = require(path.join(repoRoot, 'omp/extension.js'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS ${name}`);
    passed++;
  } catch (error) {
    console.log(`  FAIL ${name}`);
    console.log(`    Error: ${error.message}`);
    failed++;
  }
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

console.log('\n=== Testing OMP plugin adapter ===\n');

test('package manifest exposes OMP runtime adapter paths', () => {
  assert.ok(pkg.omp, 'Expected package.json#omp');
  assert.deepStrictEqual(pkg.omp.extensions, ['./omp/extension.js']);
  assert.deepStrictEqual(pkg.omp.tools, ['./omp/tools/index.js']);
  assert.deepStrictEqual(pkg.omp.commands, ['./commands']);
  assert.deepStrictEqual(pkg.omp.hooks, ['./hooks/hooks.json']);
  assert.ok(pkg.files.includes('omp/'), 'Expected npm package files to include omp/');
});

test('OMP manifest paths exist', () => {
  for (const entry of [...pkg.omp.extensions, ...pkg.omp.tools]) {
    assert.ok(fs.existsSync(path.join(repoRoot, entry)), `${entry} should exist`);
  }
  for (const entry of [...pkg.omp.commands, ...pkg.omp.hooks]) {
    assert.ok(fs.existsSync(path.join(repoRoot, entry)), `${entry} should exist`);
  }
});

test('tool factory registers seven OMP tools', () => {
  const tools = toolFactory({ cwd: repoRoot, zod: schemaStub(), exec: async () => ({ code: 0, stdout: '', stderr: '' }) });
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

if (failed > 0) {
  console.log(`\nFailed: ${failed}`);
  process.exit(1);
}

console.log(`\nPassed: ${passed}`);
