/**
 * Copyright (c) Rui Figueira.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Convert a glob pattern to a RegExp. Supported syntax:
 *   **   – matches any sequence of characters including "/"
 *   *    – matches any sequence of characters except "/"
 *   ?    – matches any single character except "/"
 * All other characters are treated as literals (regex-escaped).
 */
function globToRegex(pattern: string): RegExp {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*' && pattern[i + 1] === '*') {
      re += '.*';
      i++;
      // absorb a following slash so "**/" doesn't leave a stray "/"
      if (pattern[i + 1] === '/')
        i++;
    } else if (c === '*') {
      re += '[^/]*';
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`, 'i');
}

/**
 * Returns true when `url` matches at least one of `patterns`.
 * Empty patterns array matches everything (script applies to all URLs).
 * Pattern syntax: glob with * = any non-slash segment, ** = any path.
 * Example: "*.google.com/**" matches "www.google.com/search?q=test".
 */
export function matchesUrl(url: string, patterns: string[]): boolean {
  if (!patterns.length)
    return true;
  // Strip protocol so patterns can be written without it:
  // "*.google.com/**" instead of "https://*.google.com/**"
  const normalized = url.replace(/^https?:\/\//, '');
  return patterns.some(p => {
    try {
      return globToRegex(p).test(normalized);
    } catch {
      return false;
    }
  });
}

/**
 * Parse newline- or comma-separated pattern string into a clean array.
 */
export function parsePatterns(raw: string): string[] {
  return raw
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);
}

/**
 * Convert a full URL into a reasonable default glob pattern.
 * "https://www.example.com/foo/bar" → "www.example.com/**"
 */
export function normalizeUrlToPattern(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}/**`;
  } catch {
    return url.replace(/^https?:\/\//, '');
  }
}
