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
import { get, set, del, values, createStore } from 'idb-keyval';

const _store = createStore('playwright-crx-scripts', 'scripts');

export type SavedScript = {
  id: string;
  name: string;
  code: string;
  language: string;
  urlPatterns: string[];
  createdAt: number;
  updatedAt: number;
};

export type NewScript = Omit<SavedScript, 'id' | 'createdAt' | 'updatedAt'>;

export async function saveScript(script: NewScript): Promise<SavedScript> {
  const now = Date.now();
  const saved: SavedScript = { ...script, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  await set(saved.id, saved, _store);
  return saved;
}

export async function updateScript(id: string, patch: Partial<NewScript>): Promise<SavedScript | undefined> {
  const existing = await get<SavedScript>(id, _store);
  if (!existing)
    return undefined;
  const updated: SavedScript = { ...existing, ...patch, updatedAt: Date.now() };
  await set(id, updated, _store);
  return updated;
}

export async function deleteScript(id: string): Promise<void> {
  await del(id, _store);
}

export async function getAllScripts(): Promise<SavedScript[]> {
  const all = await values<SavedScript>(_store);
  return all
      .filter((v): v is SavedScript => v != null && typeof v === 'object' && 'id' in v)
      .sort((a, b) => b.updatedAt - a.updatedAt);
}
