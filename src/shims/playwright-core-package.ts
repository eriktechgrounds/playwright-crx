// Shim: replaces playwright-core/src/package.ts in browser builds.
// Avoids dynamic require(path.join(__dirname, '../package.json')) which fails in service workers.

export const packageRoot = 'playwright/packages/playwright-core';
export const packageJSON = { name: 'playwright-core', version: '1.60.0' };
export const binPath = '';

export function libPath(..._parts: string[]): string {
  return '';
}
