import { contextBridge, ipcRenderer } from 'electron'

const INVOKE_ALLOWLIST = new Set([
  'get-mangas',
  'set-setting',
  'get-achievements',
  'add-achievement',
  'get-maintenance-status',
  'get-setting',
  'add-manga',
  'update-manga',
  'delete-manga',
  'update-chapter',
  'toggle-featured',
  'source:get-pages',
  'manga:get-chapter-progress',
  'source:get-chapters',
  'source:preload-chapter',
  'session:flush-finished',
  'manga:save-progress',
  'source:get-details',
  'manga:check-tracked',
  'get-backup-stats',
  'perform-manual-backup',
  'export-master-archive',
  'import-master-archive',
  'pick-cover',
  'save-avatar',
  'source:search',
  'source:verify-session',
  'browser:fetch-json',
  'browser:fetch-html',
  'get-installation-date',
  'manga:get-manga-progress',
  'open-url',
  'browser:navigate',
  'manga:refresh-all-covers',
  'manga:refresh-all-data',
  'manga:reset-progress',
  'manga:reset-all-progress',
  'app:set-window-size-preset'
]);

const ON_ALLOWLIST = new Set([
  'session:flush-request'
]);

// Expose protected methods without exposing raw ipcRenderer.
contextBridge.exposeInMainWorld('electron', {
  invoke: (channel: string, data: any) => {
    if (!INVOKE_ALLOWLIST.has(channel)) {
      throw new Error(`Blocked IPC invoke channel: ${channel}`);
    }
    return ipcRenderer.invoke(channel, data)
  },
  on: (channel: string, func: (...args: any[]) => void) => {
    if (!ON_ALLOWLIST.has(channel)) {
      throw new Error(`Blocked IPC on channel: ${channel}`);
    }
    ipcRenderer.on(channel, (event, ...args) => func(...args))
  }
})
