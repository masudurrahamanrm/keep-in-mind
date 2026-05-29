import Dexie, { Table } from 'dexie';

export interface LocalNote {
  _id?: string;        // Server ID (if synced)
  localId?: string;    // Local unique ID (before sync)
  title: string;
  content: string;
  color: string;
  textColor: string;
  category: string;
  tags: string[];
  pinned: boolean;
  archived: boolean;
  trashed: boolean;
  type: string;
  version: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
  deletedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class KeepInMindDB extends Dexie {
  notes!: Table<LocalNote, string>;

  constructor() {
    super('KeepInMindDB');
    this.version(1).stores({
      notes: '++localId, _id, syncStatus, category, trashed, archived, pinned, updatedAt'
    });
  }
}

export const db = new KeepInMindDB();
