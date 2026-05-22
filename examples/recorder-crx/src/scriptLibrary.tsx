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
import type { SavedScript } from './scriptStore';
import { matchesUrl } from './urlMatcher';
import './scriptLibrary.css';

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

const langLabel: Record<string, string> = {
  'playwright-test': 'PW Test',
  'javascript': 'JS',
  'python-pytest': 'pytest',
  'python': 'Python',
  'python-async': 'Python async',
  'java-junit': 'JUnit',
  'java': 'Java',
  'csharp-mstest': 'MSTest',
  'csharp-nunit': 'NUnit',
  'csharp': 'C#',
};

export const ScriptLibrary: React.FC<{
  scripts: SavedScript[];
  currentUrl: string;
  onLoad: (script: SavedScript) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}> = ({ scripts, currentUrl, onLoad, onDelete }) => {
  const [showAll, setShowAll] = React.useState(!currentUrl);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    if (showAll || !currentUrl)
      return scripts;
    return scripts.filter(s => matchesUrl(currentUrl, s.urlPatterns));
  }, [scripts, currentUrl, showAll]);

  const hiddenCount = scripts.length - filtered.length;

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      onDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  const handleExport = (script: SavedScript) => {
    downloadText(script.name, script.code);
  };

  return (
    <div className='script-library'>
      {currentUrl && (
        <div className='script-library-filter'>
          <label>
            <input
              type='checkbox'
              checked={showAll}
              onChange={e => setShowAll(e.target.checked)}
            />
            {' Show all scripts'}
            {!showAll && hiddenCount > 0 && (
              <span className='script-library-hidden-count'> ({hiddenCount} hidden by URL filter)</span>
            )}
          </label>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className='script-library-empty'>
          {scripts.length === 0
            ? 'No saved scripts yet. Record a script and click Save.'
            : 'No scripts match the current URL. Enable "Show all" to see all scripts.'}
        </p>
      ) : (
        <table className='script-library-table'>
          <thead>
            <tr>
              <th>Name</th>
              <th>Lang</th>
              <th>URL Patterns</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(script => (
              <tr key={script.id} className={confirmDeleteId === script.id ? 'row-confirm-delete' : ''}>
                <td className='script-name' title={script.name}>{script.name}</td>
                <td>
                  <span className='lang-badge'>{langLabel[script.language] ?? script.language}</span>
                </td>
                <td className='patterns-cell'>
                  {script.urlPatterns.length === 0 ? (
                    <span className='pattern-any'>any URL</span>
                  ) : (
                    script.urlPatterns.map((p, i) => (
                      <span key={i} className='pattern-badge'>{p}</span>
                    ))
                  )}
                </td>
                <td className='actions-cell'>
                  <button className='btn-action' onClick={() => onLoad(script)}>Load</button>
                  <button className='btn-action' onClick={() => handleExport(script)}>Export</button>
                  <button
                    className={confirmDeleteId === script.id ? 'btn-action btn-danger confirm' : 'btn-action btn-danger'}
                    onClick={() => handleDelete(script.id)}
                    title={confirmDeleteId === script.id ? 'Click again to confirm deletion' : 'Delete script'}
                  >
                    {confirmDeleteId === script.id ? 'Confirm?' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
