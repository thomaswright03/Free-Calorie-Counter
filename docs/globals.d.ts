// Globals the classic scripts in docs/ put on `window` for the UI modules.
interface Window {
  AppCore: typeof import('./core.js');
  AppLocalStore: typeof import('./store-local.js');
  AppBackupFile: typeof import('./backup-file.js');
}
