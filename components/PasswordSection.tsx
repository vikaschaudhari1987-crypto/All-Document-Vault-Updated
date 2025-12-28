
import React, { useState } from 'react';
import { Key, Plus, Search, Edit2, Copy, Check, Eye, EyeOff, Save, X } from 'lucide-react';
import { PasswordEntry } from '../types';
import { translations, Language } from '../translations';

interface PasswordSectionProps {
  passwords: PasswordEntry[];
  onAdd: (p: Omit<PasswordEntry, 'id' | 'lastUpdated'>) => void;
  onUpdate: (id: string, p: Partial<PasswordEntry>) => void;
}

const PasswordSection: React.FC<PasswordSectionProps> = ({ passwords, onAdd, onUpdate }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [newEntry, setNewEntry] = useState({ service: '', username: '', password: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState({ service: '', username: '', password: '' });
  const [showPassMap, setShowPassMap] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const lang = (localStorage.getItem('vault_lang') as Language) || 'en';
  const t = (key: keyof typeof translations['en']) => translations[lang][key] || translations['en'][key];

  const filtered = passwords.filter(p => 
    p.service.toLowerCase().includes(search.toLowerCase()) || 
    p.username.toLowerCase().includes(search.toLowerCase())
  );

  const startEditing = (p: PasswordEntry) => {
    setEditingId(p.id);
    setEditEntry({ service: p.service, username: p.username, password: p.password });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleUpdate = (id: string) => {
    onUpdate(id, editEntry);
    setEditingId(null);
  };

  return (
    <div className="space-y-6 transition-colors duration-300">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <h2 className="text-xl font-black flex items-center gap-3 text-slate-900 dark:text-white">
          <Key className="w-8 h-8 p-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl" />
          {t('vault')}
        </h2>
        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder={t('searchPass')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border dark:border-slate-800 rounded-xl w-full focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm shadow-sm"
            />
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 font-black shadow-md active:scale-95 transition-all"><Plus className="w-5 h-5" /> {t('addPass')}</button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-indigo-100 dark:border-slate-800 shadow-sm space-y-5 animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <input placeholder="Service (e.g. Gmail)" className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all" value={newEntry.service} onChange={e => setNewEntry({...newEntry, service: e.target.value})} />
             <input placeholder="Username/Email" className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all" value={newEntry.username} onChange={e => setNewEntry({...newEntry, username: e.target.value})} />
             <input placeholder="Password" type="password" className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all" value={newEntry.password} onChange={e => setNewEntry({...newEntry, password: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsAdding(false)} className="px-6 py-3 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700">Cancel</button>
            <button onClick={() => { onAdd(newEntry); setIsAdding(false); setNewEntry({service:'', username:'', password:''}); }} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95">{t('saveToSheets')}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-500">
        {filtered.map(p => (
          <div key={p.id} className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border dark:border-slate-800 group relative flex flex-col h-full hover:shadow-xl transition-all">
            {editingId === p.id ? (
              // Edit Mode
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 rounded-xl flex items-center justify-center font-black">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-slate-900 dark:text-white">Edit Entry</h3>
                </div>
                <div className="space-y-3">
                  <input 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold border-2 border-transparent focus:border-indigo-500 outline-none text-sm" 
                    value={editEntry.service} 
                    onChange={e => setEditEntry({...editEntry, service: e.target.value})} 
                    placeholder="Service"
                  />
                  <input 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold border-2 border-transparent focus:border-indigo-500 outline-none text-sm" 
                    value={editEntry.username} 
                    onChange={e => setEditEntry({...editEntry, username: e.target.value})} 
                    placeholder="Username"
                  />
                  <input 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold border-2 border-transparent focus:border-indigo-500 outline-none text-sm" 
                    value={editEntry.password} 
                    onChange={e => setEditEntry({...editEntry, password: e.target.value})} 
                    placeholder="Password"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => handleUpdate(p.id)} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md hover:bg-indigo-700 transition-colors">
                    <Save className="w-4 h-4" /> Save
                  </button>
                  <button onClick={cancelEditing} className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-black text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <>
                <div className="flex justify-between items-start mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center font-black text-lg">
                      {p.service[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white">{p.service}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{new Date(p.lastUpdated).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => startEditing(p)} 
                      title="Edit"
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl flex justify-between items-center group/row transition-colors">
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-sm truncate pr-2">{p.username}</span>
                    <button 
                      onClick={() => {navigator.clipboard.writeText(p.username); setCopiedId(p.id + 'u'); setTimeout(()=>setCopiedId(null), 2000)}}
                      className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all"
                    >
                      {copiedId === p.id+'u' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-400 hover:text-indigo-500" />}
                    </button>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl flex justify-between items-center group/row transition-colors">
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm">
                      {showPassMap[p.id] ? p.password : '••••••••'}
                    </span>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setShowPassMap({...showPassMap, [p.id]: !showPassMap[p.id]})}
                        className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all"
                      >
                        {showPassMap[p.id] ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                      </button>
                      <button 
                        onClick={() => {navigator.clipboard.writeText(p.password); setCopiedId(p.id+'p'); setTimeout(()=>setCopiedId(null), 2000)}}
                        className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all"
                      >
                        {copiedId === p.id+'p' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-400 hover:text-indigo-500" />}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
        {filtered.length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center text-slate-400 font-bold border-2 border-dashed dark:border-slate-800 rounded-[2.5rem]">
            No passwords found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordSection;
