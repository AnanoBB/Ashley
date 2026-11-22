// Fails when the Playwright Docker image tag in the Dockerfile or in the CI workflow doesn't match
// the @playwright/test version in package-lock.json. The browsers in the image are built for one
// Playwright version, so a mismatch breaks the UI tests (or quietly tests another browser build).
import { readFileSync } from 'node:fs';

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const expected = lock.packages['node_modules/@playwright/test']?.version;
if (!expected) {
  console.error('@playwright/test not found in package-lock.json');
  process.exit(1);
}

const IMAGE_TAG = /mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-/g;
const files = ['Dockerfile', '.github/workflows/ci.yml'];
let ok = true;

for (const file of files) {
  const tags = [...readFileSync(file, 'utf8').matchAll(IMAGE_TAG)].map((match) => match[1]);
  if (tags.length === 0) {
    console.error(`${file}: no mcr.microsoft.com/playwright image found`);
    ok = false;
  }
  for (const tag of tags.filter((version) => version !== expected)) {
    console.error(`${file}: image v${tag}, but package-lock.json has @playwright/test ${expected}`);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log(`Playwright image v${expected} matches package-lock.json in ${files.join(', ')}`);
