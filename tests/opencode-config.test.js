/**
 * Tests for .opencode/opencode.json local file references.
 *
 * Run with: node tests/opencode-config.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

const repoRoot = path.join(__dirname, '..');
const opencodeDir = path.join(repoRoot, '.opencode');
const configPath = path.join(opencodeDir, 'opencode.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const packageJsonPath = path.join(repoRoot, 'package.json');
const opencodeIndexPath = path.join(opencodeDir, 'index.ts');

function countMarkdownFiles(dirPath) {
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .length;
}

function countSkills(dirPath) {
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(dirPath, entry.name, 'SKILL.md')))
    .length;
}

function readMetadataNumber(source, key) {
  const match = source.match(new RegExp(`\\b${key}:\\s*(\\d+),`));
  assert.ok(match, `Expected metadata.features.${key} to be declared as a numeric literal`);
  return Number.parseInt(match[1], 10);
}

function readVersion(source) {
  const match = source.match(/export const VERSION = "([^"]+)"/);
  assert.ok(match, 'Expected OpenCode index.ts to export VERSION');
  return match[1];
}

function readCatalogCounts() {
  return {
    agents: countMarkdownFiles(path.join(repoRoot, 'agents')),
    commands: countMarkdownFiles(path.join(repoRoot, 'commands')),
    skills: countSkills(path.join(repoRoot, 'skills')),
  };
}

let passed = 0;
let failed = 0;

if (
  test('plugin paths do not duplicate the .opencode directory', () => {
    const plugins = config.plugin || [];
    for (const pluginPath of plugins) {
      assert.ok(!pluginPath.includes('.opencode/'), `Plugin path should be config-relative, got: ${pluginPath}`);
      assert.ok(fs.existsSync(path.resolve(opencodeDir, pluginPath)), `Plugin path should resolve from .opencode/: ${pluginPath}`);
    }
  })
)
  passed++;
else failed++;

if (
  test('file references are config-relative and resolve to existing files', () => {
    const refs = [];

    function walk(value) {
      if (typeof value === 'string') {
        const matches = value.matchAll(/\{file:([^}]+)\}/g);
        for (const match of matches) {
          refs.push(match[1]);
        }
        return;
      }

      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }

      if (value && typeof value === 'object') {
        Object.values(value).forEach(walk);
      }
    }

    walk(config);

    assert.ok(refs.length > 0, 'Expected to find file references in opencode.json');

    for (const ref of refs) {
      assert.ok(!ref.startsWith('.opencode/'), `File ref should not duplicate .opencode/: ${ref}`);
      assert.ok(fs.existsSync(path.resolve(opencodeDir, ref)), `File ref should resolve from .opencode/: ${ref}`);
    }
  })
)
  passed++;
else failed++;

if (
  test('command markdown frontmatter uses plugin-scoped agent ids', () => {
    const commandsDir = path.join(opencodeDir, 'commands');

    for (const entry of fs.readdirSync(commandsDir)) {
      const body = fs.readFileSync(path.join(commandsDir, entry), 'utf8');
      const match = body.match(/^agent:\s*(.+)$/m);

      if (!match) {
        continue;
      }

      assert.ok(
        match[1].startsWith('everything-claude-code:'),
        `Expected plugin-scoped agent id in ${entry}, got: ${match[1]}`
      );
    }
  })
)
  passed++;
else failed++;

if (
  test('OpenCode package metadata matches package.json and catalog counts', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const indexSource = fs.readFileSync(opencodeIndexPath, 'utf8');
    const catalogCounts = readCatalogCounts();

    assert.strictEqual(readVersion(indexSource), packageJson.version);
    assert.deepStrictEqual(
      {
        agents: readMetadataNumber(indexSource, 'agents'),
        commands: readMetadataNumber(indexSource, 'commands'),
        skills: readMetadataNumber(indexSource, 'skills'),
      },
      catalogCounts
    );
  })
)
  passed++;
else failed++;

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
