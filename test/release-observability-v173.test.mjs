import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');

test('health and monitoring expose the current configurable release', () => {
  assert.match(source, /RELEASE_VERSION \|\| 'v183'/);
  assert.equal((source.match(/version:releaseVersion/g)||[]).length,2);
  assert.doesNotMatch(source,/version:'v77'/);
});
