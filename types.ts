
export enum DocCategory {
  IDENTITY = 'Identity Documents',
  VEHICLE = 'Vehicle Documents',
  EDUCATION = 'Education Documents',
  BANKING = 'Banking Documents',
  INSURANCE = 'Insurance Documents',
  OTHERS = 'Others Documents'
}

export interface Document {
  id: string;
  name: string;
  category: DocCategory;
  fileUrl: string;
  mimeType: string;
  createdAt: string;
  size: string;
  driveFileId?: string; // ID of the file in Google Drive
}

export interface PasswordEntry {
  id: string;
  service: string;
  username: string;
  password: string;
  lastUpdated: string;
  rowId?: number; // Corresponding row in Google Sheets
}

export interface VaultLockConfig {
  isEnabled: boolean;
  pin: string | null;
  useBiometrics: boolean;
}

export interface VaultConfig {
  rootFolderId: string;
  categoryFolderIds: Record<DocCategory, string>;
  passwordSheetId: string;
}

export interface AppState {
  documents: Document[];
  passwords: PasswordEntry[];
  isScanning: boolean;
  activeTab: 'documents' | 'passwords' | 'settings';
}
