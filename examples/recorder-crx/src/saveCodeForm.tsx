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

import React from 'react';
import { parsePatterns, normalizeUrlToPattern } from './urlMatcher';

export const SaveCodeForm: React.FC<{
  suggestedFilename?: string;
  /** Pre-fill URL patterns from the active tab. Omit for export-only flows. */
  currentTabUrl?: string;
  onSubmit: (result: { filename: string; urlPatterns: string[] }) => any;
}> = ({ suggestedFilename, currentTabUrl, onSubmit }) => {

  const [filename, setFilename] = React.useState<string>(suggestedFilename ?? '');
  const [patterns, setPatterns] = React.useState<string>(
    currentTabUrl ? normalizeUrlToPattern(currentTabUrl) : ''
  );

  return <form id='save-form' onSubmit={() => onSubmit({ filename, urlPatterns: parsePatterns(patterns) })}>
    <label htmlFor='filename'>Script Name:</label>
    <input
      type='text'
      id='filename'
      name='filename'
      placeholder='Enter script name'
      required
      value={filename}
      onChange={e => setFilename(e.target.value)}
    />
    {currentTabUrl !== undefined && <>
      <label htmlFor='patterns'>URL Patterns <span style={{ fontWeight: 'normal', fontSize: '11px' }}>(one per line — empty = match all URLs)</span>:</label>
      <textarea
        id='patterns'
        name='patterns'
        placeholder={'*.example.com/**\n*.google.com/**'}
        rows={3}
        value={patterns}
        onChange={e => setPatterns(e.target.value)}
        style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '12px', padding: '4px' }}
      />
    </>}
    <button id='submit' type='submit' disabled={!filename}>Save</button>
  </form>;
};
