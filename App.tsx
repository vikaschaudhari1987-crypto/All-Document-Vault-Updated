
import React, { useState, useEffect, useRef } from 'react';
import { 
  FileUp, 
  Camera, 
  LayoutDashboard, 
  Shield, 
  Plus, 
  X, 
  Loader2,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  LogOut,
  User,
  CloudLightning,
  Home,
  Lock,
  Globe,
  Fingerprint,
  Smartphone,
  ChevronRight,
  UserPlus,
  AlertTriangle
} from 'lucide-react';
import { DocCategory, Document, PasswordEntry, VaultConfig, VaultLockConfig } from './types';
import DocumentSection from './components/DocumentSection';
import PasswordSection from './components/PasswordSection';
import Scanner from './components/Scanner';
import VaultLock from './components/VaultLock';
import { geminiService } from './services/geminiService';
import { googleApiService } from './services/googleApiService';
import { translations, Language } from './translations';

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Preference State
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('vault_lang') as Language) || 'en');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => localStorage.getItem('vault_theme') === 'dark');

  // Security State
  const [lockConfig, setLockConfig] = useState<VaultLockConfig>(() => {
    const saved = localStorage.getItem('vault_lock_config');
    return saved ? JSON.parse(saved) : { isEnabled: false, pin: null, useBiometrics: false };
  });
  const [isLocked, setIsLocked] = useState<boolean>(!!lockConfig.pin && lockConfig.isEnabled);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [tempPin, setTempPin] = useState('');

  // Auth & Vault State
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('digipocket_user'));
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [isAddingNewAccount, setIsAddingNewAccount] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  
  const [vaultConfig, setVaultConfig] = useState<VaultConfig | null>(() => {
    try {
      const saved = localStorage.getItem('digipocket_config');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [setupStep, setSetupStep] = useState('');

  // Main Data State
  const [documents, setDocuments] = useState<Document[]>(() => {
    try {
      const saved = localStorage.getItem('digipocket_docs');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  });
  const [passwords, setPasswords] = useState<PasswordEntry[]>(() => {
    try {
      const saved = localStorage.getItem('digipocket_passwords');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  });
  
  const [activeTab, setActiveTab] = useState<'documents' | 'passwords' | 'settings'>('documents');
  const [selectedCategory, setSelectedCategory] = useState<DocCategory | null>(null);
  const [docSearch, setDocSearch] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [uploadModal, setUploadModal] = useState<{ isOpen: boolean; fileData?: string; fileName: string; category: DocCategory; mimeType: string }>({
    isOpen: false,
    fileName: '',
    category: DocCategory.OTHERS,
    mimeType: 'image/jpeg'
  });

  const t = (key: keyof typeof translations['en']) => (translations[lang] as any)[key] || translations['en'][key];

  // Sync Preferences & Security
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('class', 'dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('vault_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('vault_lock_config', JSON.stringify(lockConfig));
  }, [lockConfig]);

  useEffect(() => {
    localStorage.setItem('vault_lang', lang);
  }, [lang]);

  // Main Data Persistence
  useEffect(() => {
    try {
      // Create a minimized version for storage only, without affecting the active state
      const storageDocs = documents.map(doc => ({
        ...doc,
        fileUrl: (doc.fileUrl.startsWith('data:') && doc.fileUrl.length > 500000) ? 'synced_to_drive' : doc.fileUrl
      }));
      localStorage.setItem('digipocket_docs', JSON.stringify(storageDocs));
    } catch (e) { console.warn("Local storage quota full, prioritizing Drive sync"); }
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('digipocket_passwords', JSON.stringify(passwords));
    if (userEmail) localStorage.setItem('digipocket_user', userEmail);
    if (vaultConfig) localStorage.setItem('digipocket_config', JSON.stringify(vaultConfig));
  }, [passwords, userEmail, vaultConfig]);

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const executeLogin = async (email: string) => {
    setIsLoggingIn(true);
    setIsAccountPickerOpen(false);
    try {
      await new Promise(r => setTimeout(r, 1200));
      setUserEmail(email);
      if (!vaultConfig) {
        setIsInitializing(true);
        setSetupStep('Initializing Google Drive...');
        const config = await googleApiService.initializeVault(email);
        setVaultConfig(config);
      }
      showToast('Welcome to your Vault!', 'success');
    } catch (err) {
      showToast('Authentication failed', 'error');
    } finally {
      setIsLoggingIn(false);
      setIsInitializing(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Log out and clear local cache?')) {
      setUserEmail(null);
      setVaultConfig(null);
      setDocuments([]);
      setPasswords([]);
      localStorage.clear();
      window.location.reload();
    }
  };

  const finalizeUpload = async () => {
    if (!uploadModal.fileData) return;
    const tempDoc: Document = {
      id: `doc_${Date.now()}`,
      name: uploadModal.fileName || 'Untitled',
      category: uploadModal.category || DocCategory.OTHERS,
      fileUrl: uploadModal.fileData,
      mimeType: uploadModal.mimeType || 'image/jpeg',
      createdAt: new Date().toISOString(),
      size: `${(uploadModal.fileData.length / 1024 / 1024).toFixed(1)} MB`
    };
    setUploadModal({ ...uploadModal, isOpen: false });
    setIsUploading(true);
    try {
      if (vaultConfig) {
        const folderId = vaultConfig.categoryFolderIds[tempDoc.category] || vaultConfig.rootFolderId;
        const driveId = await googleApiService.syncDocumentToDrive(tempDoc, folderId);
        tempDoc.driveFileId = driveId;
      }
      setDocuments(prev => [tempDoc, ...prev]);
      showToast('Securely uploaded to Drive', 'success');
    } catch (err) {
      setDocuments(prev => [tempDoc, ...prev]);
      showToast('Saved locally (Offline)', 'info');
    } finally {
      setIsUploading(false);
    }
  };

  const goHome = () => {
    setActiveTab('documents');
    setSelectedCategory(null);
    setDocSearch('');
  };

  const handleSavePin = () => {
    if (tempPin.length !== 4) return showToast('PIN must be 4 digits', 'error');
    setLockConfig(prev => ({ ...prev, pin: tempPin, isEnabled: true }));
    setIsSettingPin(false);
    setTempPin('');
    showToast('PIN Security Enabled', 'success');
  };

  // If App is Locked, show the Lock screen overlay
  if (isLocked && lockConfig.pin) {
    return <VaultLock savedPin={lockConfig.pin} useBiometrics={lockConfig.useBiometrics} onUnlock={() => setIsLocked(false)} />;
  }

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6 transition-colors">
        <div className="bg-white rounded-[3rem] p-12 w-full max-w-md text-center shadow-2xl animate-in zoom-in-90">
          <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-black/10">
            <Shield className="w-12 h-12 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-black mb-4 text-slate-900 tracking-tight">{t('appName')}</h1>
          <p className="text-slate-500 mb-10 font-medium leading-relaxed">{t('appTagline')}</p>
          
          <button 
            onClick={() => setIsAccountPickerOpen(true)} 
            disabled={isLoggingIn} 
            className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            {isLoggingIn ? <Loader2 className="animate-spin" /> : "Connect with Google Drive"}
          </button>
        </div>

        {/* Google Account Picker Modal */}
        {isAccountPickerOpen && (
          <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10">
              <div className="p-8 text-center border-b">
                <div className="flex justify-center mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-800">Choose an account</h2>
                <p className="text-sm text-slate-500 mt-1">to continue to {t('appName')}</p>
              </div>

              {!isAddingNewAccount ? (
                <div className="p-2 max-h-80 overflow-y-auto">
                  <button 
                    onClick={() => executeLogin("user@gmail.com")}
                    className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">U</div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 text-sm">Vault User</p>
                      <p className="text-xs text-slate-500">user@gmail.com</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                  
                  <button 
                    onClick={() => setIsAddingNewAccount(true)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 text-sm">Use another account</p>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email or Phone</label>
                    <input 
                      autoFocus
                      type="email" 
                      placeholder="Enter your Gmail"
                      className="w-full p-4 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                      value={newEmailInput}
                      onChange={e => setNewEmailInput(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setIsAddingNewAccount(false)} className="flex-1 py-4 text-slate-500 font-bold text-sm">Back</button>
                    <button 
                      onClick={() => { if(newEmailInput.includes('@')) executeLogin(newEmailInput); else showToast("Enter a valid email", "error"); }} 
                      className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
              
              <div className="p-4 bg-slate-50 text-[10px] text-slate-400 text-center border-t">
                To continue, Google will share your name, email address, language preference, and profile picture with DigiVault.
              </div>
            </div>
            <button onClick={() => setIsAccountPickerOpen(false)} className="absolute top-6 right-6 p-2 text-white/50 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <CloudLightning className="w-12 h-12 text-indigo-600 animate-pulse mx-auto" />
          <h2 className="text-2xl font-black text-slate-900">{t('syncing')}</h2>
          <p className="text-slate-500 font-bold">{setupStep}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-72 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            setIsUploading(true);
            const reader = new FileReader();
            reader.onloadend = async () => {
              const fileData = reader.result as string;
              // Attempt to auto-categorize based on filename
              const suggestedCategory = await geminiService.suggestCategory(file.name);
              setUploadModal({ 
                isOpen: true, 
                fileData, 
                fileName: file.name.split('.')[0], 
                category: suggestedCategory, 
                mimeType: file.type 
              });
              setIsUploading(false);
            };
            reader.readAsDataURL(file);
          }
        }} 
      />

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 text-white shadow-2xl animate-in slide-in-from-top-10">
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
          <span className="font-bold text-sm">{toast.msg}</span>
        </div>
      )}

      {/* Mobile Top Header Branding */}
      <header className="md:hidden sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-black text-slate-900 dark:text-white tracking-tight">{t('appName')}</h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border dark:border-slate-700">
          <User className="w-5 h-5 text-slate-500" />
        </div>
      </header>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-white dark:bg-slate-900 border-r dark:border-slate-800 hidden md:flex flex-col z-40">
        <div className="p-8 pb-12">
          <div className="flex items-center gap-4 group">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 p-2.5 rounded-2xl shadow-xl shadow-indigo-500/20 flex items-center justify-center transition-transform group-hover:scale-110">
              <Shield className="w-full h-full text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{t('appName')}</h1>
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tracking-tighter uppercase">Secure Cloud Vault</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-6 space-y-2">
          <button onClick={goHome} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'documents' ? 'bg-indigo-600 text-white shadow-lg font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <LayoutDashboard className="w-5 h-5" /> {t('home')}
          </button>
          <button onClick={() => setActiveTab('passwords')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'passwords' ? 'bg-indigo-600 text-white shadow-lg font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <Shield className="w-5 h-5" /> {t('vault')}
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <SettingsIcon className="w-5 h-5" /> {t('settings')}
          </button>
        </nav>
        <div className="p-6 border-t dark:border-slate-800 space-y-3">
          {lockConfig.pin && (
            <button onClick={() => setIsLocked(true)} className="w-full flex items-center gap-4 px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 transition-all"><Lock className="w-4 h-4" /> {t('lockNow')}</button>
          )}
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-3 rounded-xl text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><LogOut className="w-4 h-4" /> {t('logout')}</button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t dark:border-slate-800 flex justify-around py-3 z-50 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        <button onClick={goHome} className={`flex flex-col items-center p-2 transition-all ${activeTab === 'documents' ? 'text-indigo-600' : 'text-slate-400'}`}><Home className="w-6 h-6" /><span className="text-[10px] uppercase font-black">{t('home')}</span></button>
        <button onClick={() => setActiveTab('passwords')} className={`flex flex-col items-center p-2 transition-all ${activeTab === 'passwords' ? 'text-indigo-600' : 'text-slate-400'}`}><Shield className="w-6 h-6" /><span className="text-[10px] uppercase font-black">{t('vault')}</span></button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center p-2 transition-all ${activeTab === 'settings' ? 'text-indigo-600' : 'text-slate-400'}`}><SettingsIcon className="w-6 h-6" /><span className="text-[10px] uppercase font-black">{t('settings')}</span></button>
      </nav>

      <main className="p-6 md:p-10 max-w-7xl mx-auto">
        {activeTab === 'documents' && (
          <DocumentSection 
            documents={documents} 
            onDelete={(doc) => { setDocuments(prev => prev.filter(d => d.id !== doc.id)); showToast('Removed', 'info'); }} 
            onUploadClick={() => fileInputRef.current?.click()} 
            onScanClick={() => setIsScanning(true)} 
            showToast={showToast} 
            userEmail={userEmail}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            search={docSearch}
            setSearch={setDocSearch}
          />
        )}
        {activeTab === 'passwords' && (
          <PasswordSection 
            passwords={passwords} 
            onAdd={(p) => { setPasswords(prev => [{...p, id: Date.now().toString(), lastUpdated: new Date().toISOString()}, ...prev]); showToast('Password Saved', 'success'); }}
            onUpdate={(id, updates) => setPasswords(prev => prev.map(p => p.id === id ? {...p, ...updates} : p))}
          />
        )}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Profile Section */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] text-center border dark:border-slate-800 shadow-sm">
              <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <User className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">{userEmail}</h2>
              <p className="text-slate-400 text-sm font-bold mt-1">{t('profile')}</p>
            </div>

            {/* Language Selection */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl"><Globe className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white">{t('language')}</h3>
                  <p className="text-xs text-slate-400 font-medium">Choose your primary language</p>
                </div>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                <button onClick={() => setLang('en')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${lang === 'en' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-500'}`}>English</button>
                <button onClick={() => setLang('hi')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${lang === 'hi' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-500'}`}>हिंदी</button>
              </div>
            </div>

            {/* Security Section */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border dark:border-slate-800 shadow-sm space-y-8">
              <div className="flex items-center gap-3">
                <Smartphone className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{t('securityPrivacy')}</h3>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-slate-200">{t('appLock')}</h4>
                    <p className="text-xs text-slate-400 font-medium">Protect your vault with a 4-digit PIN</p>
                  </div>
                  <button onClick={() => { if(!lockConfig.pin) setIsSettingPin(true); else setLockConfig(prev => ({...prev, isEnabled: !prev.isEnabled})) }} className={`w-14 h-8 rounded-full transition-all relative ${lockConfig.isEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all ${lockConfig.isEnabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {lockConfig.isEnabled && (
                  <button onClick={() => setIsSettingPin(true)} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700">
                    <span className="font-bold text-sm text-slate-600 dark:text-slate-300">Update PIN Code</span>
                    <span className="text-indigo-600 font-black text-xs">CHANGE</span>
                  </button>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-slate-200">{t('biometric')}</h4>
                    <p className="text-xs text-slate-400 font-medium">Fingerprint or Face ID unlock</p>
                  </div>
                  <button onClick={() => setLockConfig(prev => ({...prev, useBiometrics: !prev.useBiometrics}))} className={`w-14 h-8 rounded-full transition-all relative ${lockConfig.useBiometrics ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all ${lockConfig.useBiometrics ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Dark Mode */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white">{t('darkMode')}</h3>
                <p className="text-xs text-slate-400 font-medium">Ease eye strain with darker colors</p>
              </div>
               <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-14 h-8 rounded-full transition-all relative ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                 <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all ${isDarkMode ? 'left-7' : 'left-1'}`} />
               </button>
            </div>

            {/* Logout Section (Danger Zone) */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-red-100 dark:border-red-900/20 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white">Sign Out</h3>
                    <p className="text-xs text-slate-400 font-medium">Securely exit and clear cache</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="px-6 py-3 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-200 dark:shadow-none hover:bg-red-600 transition-all active:scale-95 text-xs uppercase tracking-wider"
                >
                  {t('logout')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* PIN Setup Modal */}
      {isSettingPin && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white text-center">Set Secure PIN</h3>
            <p className="text-sm text-slate-500 font-medium mb-8 text-center">Choose a 4-digit code to protect your vault</p>
            <input 
              type="password"
              maxLength={4}
              pattern="\d*"
              inputMode="numeric"
              value={tempPin}
              onChange={e => setTempPin(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-3xl tracking-[1.5rem] p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-indigo-100 dark:border-slate-700 focus:border-indigo-500 outline-none mb-8 font-black text-indigo-600"
              placeholder="••••"
            />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setIsSettingPin(false); setTempPin(''); }} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl">Cancel</button>
              <button onClick={handleSavePin} className="py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg">Set PIN</button>
            </div>
          </div>
        </div>
      )}

      {/* Scanner & Upload Logic */}
      {isScanning && <Scanner onCapture={(base64) => {
        setIsScanning(false);
        setUploadModal({ isOpen: true, fileData: `data:image/jpeg;base64,${base64}`, fileName: `Scan_${Date.now()}`, category: DocCategory.OTHERS, mimeType: 'image/jpeg' });
      }} onClose={() => setIsScanning(false)} />}

      {isUploading && (
        <div className="fixed inset-0 z-[200] bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
          <p className="font-black text-xl text-slate-900 dark:text-white">{t('syncing')}</p>
        </div>
      )}
      
      {uploadModal.isOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black mb-6 text-slate-900 dark:text-white">New Document</h3>
            <div className="space-y-4">
              <input value={uploadModal.fileName} onChange={e => setUploadModal({...uploadModal, fileName: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl outline-none font-bold border-2 border-transparent focus:border-indigo-500" placeholder="File Name" />
              <select value={uploadModal.category} onChange={e => setUploadModal({...uploadModal, category: e.target.value as DocCategory})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl outline-none font-bold border-2 border-transparent focus:border-indigo-500">
                {Object.values(DocCategory).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setUploadModal({ ...uploadModal, isOpen: false })} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black">Cancel</button>
                <button onClick={finalizeUpload} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
