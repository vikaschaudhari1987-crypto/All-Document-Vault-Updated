
import React, { useState } from 'react';
import { 
  Search, 
  Share2, 
  ArrowLeft,
  FileUp,
  Camera,
  Download,
  Eye,
  X,
  ChevronRight,
  Mail,
  Trash2,
  FileText,
  Shield,
  FileSpreadsheet,
  Table,
  FileJson,
  FileEdit,
  FileSignature
} from 'lucide-react';
import { Document, DocCategory } from '../types';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../constants';
import { translations, Language } from '../translations';

interface DocumentSectionProps {
  documents: Document[];
  onDelete: (doc: Document) => void;
  onUploadClick: () => void;
  onScanClick: () => void;
  showToast: (msg: string, type: 'success' | 'info' | 'error') => void;
  userEmail: string | null;
  selectedCategory: DocCategory | null;
  setSelectedCategory: (cat: DocCategory | null) => void;
  search: string;
  setSearch: (val: string) => void;
}

const DocumentSection: React.FC<DocumentSectionProps> = ({ 
  documents = [], 
  onDelete, 
  onUploadClick, 
  onScanClick,
  showToast,
  userEmail,
  selectedCategory,
  setSelectedCategory,
  search,
  setSearch
}) => {
  const [viewingImageDoc, setViewingImageDoc] = useState<Document | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<Document | null>(null);
  
  const lang = (localStorage.getItem('vault_lang') as Language) || 'en';
  const t = (key: keyof typeof translations['en']) => translations[lang][key] || translations['en'][key];

  const filtered = (Array.isArray(documents) ? documents : []).filter(doc => {
    if (!doc || !doc.name) return false;
    const matchesSearch = doc.name.toLowerCase().includes((search || '').toLowerCase());
    const matchesCategory = selectedCategory ? doc.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const categories = Object.values(DocCategory);
  const statsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = (Array.isArray(documents) ? documents : []).filter(d => d?.category === cat).length;
    return acc;
  }, {} as Record<DocCategory, number>);

  const getFileExtension = (mimeType: string): string => {
    switch (mimeType) {
      case 'application/pdf': return '.pdf';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': return '.docx';
      case 'application/msword': return '.doc';
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': return '.xlsx';
      case 'application/vnd.ms-excel': return '.xls';
      case 'text/csv': return '.csv';
      case 'text/plain': return '.txt';
      case 'image/png': return '.png';
      case 'image/jpeg': return '.jpg';
      default: return '';
    }
  };

  const handleDownload = (doc: Document) => {
    if (!doc?.fileUrl || doc.fileUrl === 'synced_to_drive') {
      showToast('Fetching from Cloud...', 'info');
      return;
    }
    try {
      const link = document.createElement('a');
      link.href = doc.fileUrl;
      const extension = getFileExtension(doc.mimeType);
      const fileName = doc.name.toLowerCase().endsWith(extension) ? doc.name : `${doc.name}${extension}`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Download started', 'success');
    } catch (err) {
      showToast('Download failed', 'error');
    }
  };

  const renderFileIcon = (doc: Document) => {
    const mt = doc.mimeType;
    if (mt.startsWith('image/')) {
      return <img src={doc.fileUrl} className="w-full h-full object-cover" alt="" />;
    }
    if (mt === 'application/pdf') {
      return <FileText className="w-12 h-12 text-red-500" />;
    }
    if (mt.includes('spreadsheet') || mt.includes('excel') || mt === 'text/csv') {
      return <FileSpreadsheet className="w-12 h-12 text-emerald-500" />;
    }
    if (mt.includes('word') || mt.includes('officedocument.word')) {
      return <FileSignature className="w-12 h-12 text-blue-500" />;
    }
    if (mt === 'text/plain') {
      return <FileEdit className="w-12 h-12 text-slate-500" />;
    }
    return <FileText className="w-12 h-12 text-indigo-400" />;
  };

  const handleView = (doc: Document) => {
    if (!doc) return;
    const isImage = doc.mimeType.startsWith('image/');
    
    if (isImage) {
      setViewingImageDoc(doc);
    } else {
      if (doc.fileUrl === 'synced_to_drive') {
        showToast('Document in Cloud. Please wait...', 'info');
        return;
      }
      try {
        let finalUrl = doc.fileUrl;
        if (doc.fileUrl.startsWith('data:')) {
          const parts = doc.fileUrl.split(',');
          const byteString = atob(parts[1]);
          const mimeString = parts[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          const blob = new Blob([ab], { type: mimeString });
          finalUrl = URL.createObjectURL(blob);
        }
        const newWindow = window.open(finalUrl, '_blank');
        if (!newWindow) showToast('Popup blocked!', 'error');
      } catch (err) {
        showToast('Could not open file', 'error');
      }
    }
  };

  const handleShare = async (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation();
    if (!doc) return;
    
    setSharingId(doc.id);
    const appName = t('appName');
    const shareText = `📄 Document: ${doc.name}\n🛡️ Shared via ${appName}`;
    
    // Initial data to share (text only by default)
    let shareData: ShareData = {
      title: appName,
      text: shareText
    };

    try {
      if (!navigator.share) {
        throw new Error('Web Share not supported');
      }

      // Try to include the actual file if available
      if (doc.fileUrl && doc.fileUrl.startsWith('data:')) {
        const response = await fetch(doc.fileUrl);
        const blob = await response.blob();
        const ext = getFileExtension(doc.mimeType) || '.bin';
        const file = new File([blob], `${doc.name}${ext}`, { type: doc.mimeType });

        // CRITICAL: Check if this browser is capable of sharing THIS specific file type
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }
      }

      await navigator.share(shareData);
      
    } catch (err: any) {
      // User cancelled or browser rejected the specific file type
      if (err.name === 'AbortError') {
        // Just a cancellation, no toast needed
      } else {
        // True fallback: Clipboard
        try {
          const clipboardText = `${doc.name}\n${shareText}`;
          await navigator.clipboard.writeText(clipboardText);
          showToast('Info copied to clipboard', 'info');
        } catch (clipErr) {
          showToast('Sharing not available', 'error');
        }
      }
    } finally {
      setTimeout(() => setSharingId(null), 800);
    }
  };

  return (
    <div className="space-y-8 pb-10 transition-colors duration-300">
      {/* Header Info Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border dark:border-slate-800 shadow-sm animate-in fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-xl">
               <Shield className="w-5 h-5" />
             </div>
             <h2 className="text-xl font-black text-slate-900 dark:text-white leading-none">
               {selectedCategory || t('appName')}
             </h2>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter hidden sm:block">{userEmail?.split('@')[0]}</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder={t('searchDocs')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-12 pr-4 py-5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-transparent border-2 rounded-[1.5rem] w-full outline-none focus:border-indigo-500 font-bold text-sm shadow-inner transition-colors"
          />
        </div>

        {/* Action Buttons */}
        {!search && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <button onClick={onUploadClick} className="flex flex-col items-center gap-3 py-5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-2xl font-black border dark:border-indigo-800 active:scale-95 transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/30">
              <FileUp className="w-6 h-6" /> <span className="text-xs uppercase">{t('gallery')}</span>
            </button>
            <button onClick={onScanClick} className="flex flex-col items-center gap-3 py-5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-2xl font-black border dark:border-purple-800 active:scale-95 transition-all hover:bg-purple-100 dark:hover:bg-purple-900/30">
              <Camera className="w-6 h-6" /> <span className="text-xs uppercase">{t('scan')}</span>
            </button>
          </div>
        )}

        {selectedCategory && (
          <button onClick={() => setSelectedCategory(null)} className="w-full flex items-center justify-center gap-2 text-indigo-600 font-bold py-3 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all border-2 border-dashed border-indigo-100 dark:border-indigo-900/30">
            <ArrowLeft className="w-5 h-5" /> {t('backToFolders')}
          </button>
        )}
      </div>

      {(selectedCategory || search) ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
          {filtered.length > 0 ? filtered.map(doc => (
            <div key={doc.id} className="bg-white dark:bg-slate-900 p-3 rounded-2xl border dark:border-slate-800 hover:shadow-lg transition-all flex flex-col group">
              <div onClick={() => handleView(doc)} className="aspect-[4/3] bg-slate-50 dark:bg-slate-800 rounded-xl mb-3 flex items-center justify-center border dark:border-slate-700 cursor-pointer overflow-hidden relative">
                {renderFileIcon(doc)}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"><Eye className="text-white" /></div>
              </div>
              <h3 className="font-black text-sm truncate px-1 text-slate-800 dark:text-white">{doc.name}</h3>
              <div className="mt-3 grid grid-cols-4 gap-1">
                <button onClick={() => handleView(doc)} title="View" className="p-2 bg-slate-50 dark:bg-slate-800 text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"><Eye className="w-4 h-4" /></button>
                <button onClick={() => handleDownload(doc)} title="Download" className="p-2 bg-slate-50 dark:bg-slate-800 text-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"><Download className="w-4 h-4" /></button>
                <button onClick={(e) => handleShare(e, doc)} title="Share" className={`p-2 rounded-lg transition-all ${sharingId === doc.id ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-50 dark:bg-slate-800 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}><Share2 className="w-4 h-4" /></button>
                <button onClick={() => setConfirmDeleteDoc(doc)} title="Delete" className="p-2 bg-slate-50 dark:bg-slate-800 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center text-gray-400 font-bold">No documents found</div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-300">
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className="flex flex-col items-start p-6 bg-white dark:bg-slate-900 rounded-[2rem] border dark:border-slate-800 hover:border-indigo-500 hover:shadow-md transition-all text-left shadow-sm group">
              <div className={`p-4 rounded-2xl mb-5 ${CATEGORY_COLORS[cat].split(' ')[0]} ${CATEGORY_COLORS[cat].split(' ')[1]} transition-transform group-hover:scale-110`}>
                {CATEGORY_ICONS[cat]}
              </div>
              <div className="flex items-center justify-between w-full">
                <h3 className="font-black text-lg text-slate-800 dark:text-white">{cat}</h3>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest">{statsByCategory[cat] || 0} {t('documents')}</p>
            </button>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-xl font-black text-center mb-2 text-slate-900 dark:text-white">Delete Document?</h3>
              <p className="text-center text-gray-500 dark:text-slate-400 text-sm mb-8 font-medium">Permanently remove "{confirmDeleteDoc.name}"?</p>
              <div className="flex flex-col gap-3">
                 <button onClick={() => { onDelete(confirmDeleteDoc); setConfirmDeleteDoc(null); }} className="w-full py-4 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-200 dark:shadow-none hover:bg-red-600 transition-all">Confirm Delete</button>
                 <button onClick={() => setConfirmDeleteDoc(null)} className="w-full py-4 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">Cancel</button>
              </div>
           </div>
        </div>
      )}

      {/* Image Preview Overlay */}
      {viewingImageDoc && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col p-4 animate-in fade-in">
          <header className="flex items-center justify-between py-2 mb-4">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-white/10 rounded-xl"><Eye className="text-indigo-400 w-6 h-6" /></div>
               <div className="text-white"><h3 className="font-black text-sm">{viewingImageDoc.name}</h3><p className="opacity-40 text-[10px] uppercase font-bold tracking-widest">{viewingImageDoc.category}</p></div>
            </div>
            <button onClick={() => setViewingImageDoc(null)} className="p-3 bg-red-500/20 text-red-500 rounded-full border border-red-500/30 hover:bg-red-500/40 transition-all"><X className="w-5 h-5" /></button>
          </header>
          <div className="flex-1 bg-slate-900 rounded-[2rem] overflow-hidden border border-white/5 relative">
             <img src={viewingImageDoc.fileUrl} className="w-full h-full object-contain" alt="" />
          </div>
          <footer className="mt-4 flex justify-center pb-2">
             <button onClick={() => setViewingImageDoc(null)} className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-black shadow-xl active:scale-95 transition-all">Close Preview</button>
          </footer>
        </div>
      )}
    </div>
  );
};

export default DocumentSection;
