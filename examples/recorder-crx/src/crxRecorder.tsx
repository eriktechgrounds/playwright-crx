/**
 * Copyright (c) Rui Figueira.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as React from 'react';
import { Toolbar } from '@web/components/toolbar';
import { ToolbarButton, ToolbarSeparator } from '@web/components/toolbarButton';
import { Dialog } from './dialog';
import { PreferencesForm } from './preferencesForm';
import type { Source } from '@recorder/recorderTypes';
import { Recorder } from '@recorder/recorder';
import type { CrxSettings } from './settings';
import { addSettingsChangedListener, defaultSettings, loadSettings, removeSettingsChangedListener } from './settings';
import ModalContainer, { create as createModal } from 'react-modal-promise';
import { SaveCodeForm } from './saveCodeForm';
import { saveScript, deleteScript, getAllScripts, type SavedScript } from './scriptStore';
import { normalizeUrlToPattern } from './urlMatcher';
import { ScriptLibrary } from './scriptLibrary';
import './crxRecorder.css';
import './form.css';

function download(filename: string, text: string) {
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

function generateDatetimeSuffix() {
  return new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '-');
}

const codegenFilenames: Record<string, string> = {
  'javascript': 'example.js',
  'playwright-test': 'example.spec.ts',
  'java-junit': 'TestExample.java',
  'java': 'Example.java',
  'python-pytest': 'test_example.py',
  'python': 'example.py',
  'python-async': 'example.py',
  'csharp-mstest': 'Tests.cs',
  'csharp-nunit': 'Tests.cs',
  'csharp': 'Example.cs',
};

export const CrxRecorder: React.FC = ({
}) => {
  const [settings, setSettings] = React.useState<CrxSettings>(defaultSettings);
  const [sources, setSources] = React.useState<Source[]>([]);
  const [selectedFileId, setSelectedFileId] = React.useState<string>(defaultSettings.targetLanguage);
  const selectedFileIdRef = React.useRef(selectedFileId);
  React.useEffect(() => { selectedFileIdRef.current = selectedFileId; }, [selectedFileId]);

  const portRef = React.useRef<chrome.runtime.Port | null>(null);
  const [activeTabUrl, setActiveTabUrl] = React.useState<string>('');
  const [savedScripts, setSavedScripts] = React.useState<SavedScript[]>([]);
  const [libraryOpen, setLibraryOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const port = chrome.runtime.connect({ name: 'recorder' });
    portRef.current = port;
    const onMessage = (msg: any) => {
      if (!('type' in msg) || msg.type !== 'recorder')
        return;

      switch (msg.method) {
        case 'setPaused':
          window.dispatch?.({ method: 'pauseStateChanged', params: { paused: msg.paused } });
          break;
        case 'setMode':
          window.dispatch?.({ method: 'modeChanged', params: { mode: msg.mode } });
          break;
        case 'setSources':
          setSources(msg.sources);
          window.dispatch?.({ method: 'sourcesUpdated', params: { sources: msg.sources } });
          window.dispatch?.({ method: 'sourceRevealRequested', params: { sourceId: selectedFileIdRef.current } });
          break;
        case 'resetCallLogs':
          window.dispatch?.({ method: 'callLogsUpdated', params: { callLogs: [] } });
          break;
        case 'updateCallLogs':
          window.dispatch?.({ method: 'callLogsUpdated', params: { callLogs: msg.callLogs } });
          break;
        case 'setRunningFile':
          window.dispatch?.({ method: 'sourceRevealRequested', params: { sourceId: msg.file } });
          break;
        case 'elementPicked':
          window.dispatch?.({ method: 'elementPicked', params: { elementInfo: msg.elementInfo, userGesture: msg.userGesture } });
          break;
      }
    };
    port.onMessage.addListener(onMessage);

    window.sendCommand = async (data: { method: string; params?: any }) => {
      if (data.method === 'fileChanged') {
        const fileId = data.params?.fileId;
        port.postMessage({ type: 'recorderEvent', event: 'fileChanged', params: { file: fileId } });
        if (fileId)
          setSelectedFileId(fileId);
      } else {
        port.postMessage({ type: 'recorderEvent', event: data.method, params: data.params ?? {} });
      }
    };

    loadSettings().then(settings => {
      setSettings(settings);
      setSelectedFileId(settings.targetLanguage);
    }).catch(() => {});

    addSettingsChangedListener(setSettings);

    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.url)
        setActiveTabUrl(tab.url);
    }).catch(() => {});

    getAllScripts().then(setSavedScripts).catch(() => {});

    return () => {
      removeSettingsChangedListener(setSettings);
      portRef.current = null;
      port.disconnect();
    };
  }, []);

  const source = React.useMemo(() => sources.find(s => s.id === selectedFileId), [sources, selectedFileId]);

  const requestStorageState = React.useCallback(() => {
    if (!settings.experimental)
      return;

    chrome.runtime.sendMessage({ event: 'storageStateRequested' }).then(storageState => {
      const fileSuffix = generateDatetimeSuffix();
      download(`storageState-${fileSuffix}.json`, JSON.stringify(storageState, null, 2));
    });
  }, [settings]);

  const showPreferences = React.useCallback(() => {
    const modal = createModal(({ isOpen, onResolve }) =>
      <Dialog title='Preferences' isOpen={isOpen} onClose={onResolve}>
        <PreferencesForm />
      </Dialog>
    );
    modal().catch(() => {});
  }, []);

  const saveToLibrary = React.useCallback(() => {
    if (!settings.experimental)
      return;
    const code = source?.text;
    if (!code)
      return;
    const modal = createModal(({ isOpen, onResolve, onReject }) =>
      <Dialog title='Save to Library' isOpen={isOpen} onClose={onReject}>
        <SaveCodeForm onSubmit={onResolve} suggestedFilename={codegenFilenames[selectedFileId]} currentTabUrl={activeTabUrl} />
      </Dialog>
    );
    modal()
        .then(({ filename, urlPatterns }) => {
          saveScript({ name: filename, code, language: selectedFileId, urlPatterns })
              .then(saved => setSavedScripts(prev => [saved, ...prev.filter(s => s.id !== saved.id)]))
              .catch(() => {});
        })
        .catch(() => {});
  }, [settings, source, selectedFileId, activeTabUrl]);

  const exportCurrentCode = React.useCallback(() => {
    if (!settings.experimental)
      return;
    const modal = createModal(({ isOpen, onResolve, onReject }) =>
      <Dialog title='Export code' isOpen={isOpen} onClose={onReject}>
        <SaveCodeForm onSubmit={onResolve} suggestedFilename={codegenFilenames[selectedFileId]} />
      </Dialog>
    );
    modal()
        .then(({ filename }) => {
          const code = source?.text;
          if (!code)
            return;
          download(filename, code);
        })
        .catch(() => {});
  }, [settings, source, selectedFileId]);

  const loadScriptIntoEditor = React.useCallback((script: SavedScript) => {
    const port = portRef.current;
    if (!port)
      return;
    port.postMessage({ type: 'recorderEvent', event: 'fileChanged', params: { file: 'playwright-test' } });
    setSelectedFileId('playwright-test');
    port.postMessage({ type: 'recorderEvent', event: 'codeChanged', params: { code: script.code } });
    setLibraryOpen(false);
  }, []);

  const deleteFromLibrary = React.useCallback((id: string) => {
    deleteScript(id)
        .then(() => setSavedScripts(prev => prev.filter(s => s.id !== id)))
        .catch(() => {});
  }, []);

  const handleFileImport = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file)
      return;
    e.target.value = '';
    const code = await file.text();
    const modal = createModal(({ isOpen, onResolve, onReject }) =>
      <Dialog title='Import Script' isOpen={isOpen} onClose={onReject}>
        <SaveCodeForm onSubmit={onResolve} suggestedFilename={file.name} currentTabUrl={activeTabUrl} />
      </Dialog>
    );
    modal()
        .then(({ filename, urlPatterns }) => {
          saveScript({ name: filename, code, language: 'playwright-test', urlPatterns })
              .then(saved => {
                setSavedScripts(prev => [saved, ...prev]);
                loadScriptIntoEditor(saved);
              })
              .catch(() => {});
        })
        .catch(() => {});
  }, [activeTabUrl, loadScriptIntoEditor]);

  React.useEffect(() => {
    if (!settings.experimental)
      return;

    const keydownHandler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveToLibrary();
      }
    };
    window.addEventListener('keydown', keydownHandler);

    return () => {
      window.removeEventListener('keydown', keydownHandler);
    };
  }, [selectedFileId, settings, saveToLibrary]);

  return <>
    <ModalContainer />
    <input ref={fileInputRef} type='file' accept='.js,.ts,.py,.cs,.java' style={{ display: 'none' }} onChange={handleFileImport} />
    <Dialog title='Script Library' isOpen={libraryOpen} onClose={() => setLibraryOpen(false)}>
      <ScriptLibrary
        scripts={savedScripts}
        currentUrl={activeTabUrl}
        onLoad={loadScriptIntoEditor}
        onDelete={deleteFromLibrary}
        onRefresh={() => getAllScripts().then(setSavedScripts).catch(() => {})}
      />
    </Dialog>

    <div className='recorder'>
      {settings.experimental && <>
        <Toolbar>
          <ToolbarButton icon='save' title='Save to Library' disabled={false} onClick={saveToLibrary}>Save</ToolbarButton>
          <ToolbarButton icon='folder-opened' title='Script Library' disabled={false} onClick={() => setLibraryOpen(true)}>Library</ToolbarButton>
          <div style={{ flex: 'auto' }}></div>
          <div className='dropdown'>
            <ToolbarButton icon='tools' title='Tools' disabled={false} onClick={() => {}}></ToolbarButton>
            <div className='dropdown-content right-align'>
              <a href='#' onClick={requestStorageState}>Download storage state</a>
              <a href='#' onClick={exportCurrentCode}>Export current script</a>
              <a href='#' onClick={() => fileInputRef.current?.click()}>Import script from file</a>
            </div>
          </div>
          <ToolbarSeparator />
          <ToolbarButton icon='settings-gear' title='Preferences' onClick={showPreferences}></ToolbarButton>
        </Toolbar>
      </>}
      <Recorder />
    </div>
  </>;
};
