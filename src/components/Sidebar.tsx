import React, { useState } from 'react';
import {
  FilePlus,
  FolderPlus,
  Folder,
  FolderOpen,
  Pin,
  PinOff,
  Trash2,
  Copy,
  Edit2,
  Search,
  ChevronRight,
  ChevronDown,
  Sparkles,
  RotateCcw,
  MoreVertical,
  Sliders,
  X,
  FileText,
  Clock,
  HardDrive,
  ListTree,
  Hash,
  Check,
} from 'lucide-react';
import { DocumentItem, FolderItem, Language, TocItem } from '../types';
import { translations } from '../utils/i18n';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
  documents: DocumentItem[];
  folders: FolderItem[];
  currentDocId: string | null;
  toc?: TocItem[];
  onSelectDoc: (id: string) => void;
  onSelectHeading?: (id: string, text: string) => void;
  onCreateDoc: (folderId?: string | null) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onPinDoc: (id: string, isPinned: boolean) => void;
  onDuplicateDoc: (id: string) => void;
  onRenameDoc: (id: string, newTitle: string) => void;
  onMoveDocToFolder: (docId: string, folderId: string | null) => void;
  onMoveDocToTrash: (id: string) => void;
  onRestoreDoc: (id: string) => void;
  onDeleteDocPermanent: (id: string) => void;
  onEmptyTrash: () => void;
  onOpenSettings: () => void;
  language: Language;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onCloseMobile,
  documents,
  folders,
  currentDocId,
  toc = [],
  onSelectDoc,
  onSelectHeading,
  onCreateDoc,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onPinDoc,
  onDuplicateDoc,
  onRenameDoc,
  onMoveDocToFolder,
  onMoveDocToTrash,
  onRestoreDoc,
  onDeleteDocPermanent,
  onEmptyTrash,
  onOpenSettings,
  language,
}) => {
  const t = translations[language].sidebar;
  const [sidebarTab, setSidebarTab] = useState<'docs' | 'toc'>('docs');
  const [searchQuery, setSearchQuery] = useState('');
  const [tocSearchQuery, setTocSearchQuery] = useState('');
  const [activeFolderFilter, setActiveFolderFilter] = useState<string | 'all' | 'pinned' | 'trash'>('all');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [openDocMenuId, setOpenDocMenuId] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [copiedToc, setCopiedToc] = useState(false);

  if (!isOpen) return null;

  // Filter documents
  const nonTrashDocs = documents.filter((d) => !d.isTrash);
  const trashDocs = documents.filter((d) => d.isTrash);

  let filteredDocs = nonTrashDocs;

  if (activeFolderFilter === 'pinned') {
    filteredDocs = nonTrashDocs.filter((d) => d.isPinned);
  } else if (activeFolderFilter === 'trash') {
    filteredDocs = trashDocs;
  } else if (activeFolderFilter !== 'all') {
    filteredDocs = nonTrashDocs.filter((d) => d.folderId === activeFolderFilter);
  }

  // Full-text search
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredDocs = (activeFolderFilter === 'trash' ? trashDocs : nonTrashDocs).filter(
      (d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)
    );
  }

  const filteredToc = tocSearchQuery.trim()
    ? toc.filter((item) => item.text.toLowerCase().includes(tocSearchQuery.toLowerCase().trim()))
    : toc;

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const handleRenameFolderSubmit = (id: string) => {
    if (renameFolderName.trim()) {
      onRenameFolder(id, renameFolderName.trim());
      setEditingFolderId(null);
    }
  };

  const toggleFolderCollapse = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleCopyTocOutline = () => {
    if (toc.length === 0) return;
    const outlineMarkdown = toc
      .map((item) => `${'  '.repeat(Math.max(0, item.level - 1))}- ${item.text}`)
      .join('\n');
    navigator.clipboard.writeText(outlineMarkdown);
    setCopiedToc(true);
    setTimeout(() => setCopiedToc(false), 2000);
  };

  return (
    <aside
      id="app-sidebar"
      className="w-72 sm:w-80 flex flex-col h-full bg-slate-50 border-r border-slate-200 select-none z-30 transition-all text-slate-700 shadow-sm"
    >
      {/* Top App Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-600/20">
            MD
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900 block leading-tight">
              MDEdit
            </span>
            <span className="text-[10px] text-slate-500 font-medium leading-none">
              Markdown Editor
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              onCreateDoc(
                activeFolderFilter !== 'all' &&
                  activeFolderFilter !== 'pinned' &&
                  activeFolderFilter !== 'trash'
                  ? activeFolderFilter
                  : null
              )
            }
            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold shadow-xs flex items-center gap-1 transition-all cursor-pointer"
            title={translations[language].nav.newDoc}
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline-block text-[11px]">Tạo mới</span>
          </button>
          <button
            onClick={onCloseMobile}
            className="sm:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Switchable Navigation Tabs: [Tài liệu] | [Mục lục / Tab of Contents] */}
      <div className="px-3 pt-2.5 pb-1 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center p-1 rounded-xl bg-slate-200/80 text-xs font-medium">
          <button
            onClick={() => setSidebarTab('docs')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              sidebarTab === 'docs'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tài liệu</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
              {nonTrashDocs.length}
            </span>
          </button>

          <button
            onClick={() => setSidebarTab('toc')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              sidebarTab === 'toc'
                ? 'bg-white text-indigo-700 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListTree className="w-3.5 h-3.5 text-indigo-600" />
            <span>Mục lục (TOC)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono">
              {toc.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: DOCUMENTS & FOLDERS */}
      {sidebarTab === 'docs' && (
        <>
          {/* Search Input */}
          <div className="p-3 pb-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all shadow-xs">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-transparent outline-none text-xs text-slate-800 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation Sections & Folders */}
          <div className="flex-1 overflow-y-auto px-3 space-y-4 text-xs">
            {/* Quick Nav Filter Buttons */}
            <div className="space-y-0.5">
              <button
                onClick={() => setActiveFolderFilter('all')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeFolderFilter === 'all'
                    ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{t.allDocs}</span>
                </div>
                <span className="text-[10px] opacity-70 font-mono font-semibold">
                  {nonTrashDocs.length}
                </span>
              </button>

              <button
                onClick={() => setActiveFolderFilter('pinned')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeFolderFilter === 'pinned'
                    ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                  <span>{t.pinned}</span>
                </div>
                <span className="text-[10px] opacity-70 font-mono font-semibold">
                  {nonTrashDocs.filter((d) => d.isPinned).length}
                </span>
              </button>

              <button
                onClick={() => setActiveFolderFilter('trash')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeFolderFilter === 'trash'
                    ? 'bg-rose-50 text-rose-900 font-bold border border-rose-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>{t.trash}</span>
                </div>
                <span className="text-[10px] opacity-70 font-mono font-semibold">
                  {trashDocs.length}
                </span>
              </button>
            </div>

            {/* Folders Section */}
            <div>
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>{t.folders}</span>
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                  title={t.createFolderTitle}
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* New folder input */}
              {isCreatingFolder && (
                <form
                  onSubmit={handleCreateFolderSubmit}
                  className="p-2 mb-1.5 rounded-xl bg-white border border-indigo-200 shadow-xs"
                >
                  <input
                    type="text"
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder={t.folderNamePlaceholder}
                    className="w-full bg-slate-50 text-slate-900 text-xs px-2.5 py-1.5 rounded-lg outline-none border border-slate-200 focus:border-indigo-500"
                  />
                  <div className="flex justify-end gap-1 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingFolder(false)}
                      className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 text-[11px] bg-indigo-600 text-white rounded font-medium shadow-xs"
                    >
                      Tạo
                    </button>
                  </div>
                </form>
              )}

              {/* Folders List */}
              <div className="space-y-0.5">
                {folders.map((folder) => {
                  const docCountInFolder = nonTrashDocs.filter(
                    (d) => d.folderId === folder.id
                  ).length;
                  const isSelectedFolder = activeFolderFilter === folder.id;
                  const isCollapsed = collapsedFolders[folder.id];

                  return (
                    <div key={folder.id} className="group/folder">
                      {editingFolderId === folder.id ? (
                        <div className="p-1.5 bg-white rounded-lg border border-indigo-200">
                          <input
                            type="text"
                            autoFocus
                            value={renameFolderName}
                            onChange={(e) => setRenameFolderName(e.target.value)}
                            onBlur={() => handleRenameFolderSubmit(folder.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameFolderSubmit(folder.id);
                              if (e.key === 'Escape') setEditingFolderId(null);
                            }}
                            className="w-full bg-slate-50 text-slate-900 text-xs px-2 py-1 rounded outline-none border border-slate-200"
                          />
                        </div>
                      ) : (
                        <div
                          onClick={() => setActiveFolderFilter(folder.id)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                            isSelectedFolder
                              ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              onClick={(e) => toggleFolderCollapse(folder.id, e)}
                              className="p-0.5 text-slate-400 hover:text-slate-700"
                            >
                              {isCollapsed ? (
                                <ChevronRight className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                            <Folder className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="truncate">{folder.name}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-mono font-semibold">
                              {docCountInFolder}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFolderId(folder.id);
                                setRenameFolderName(folder.name);
                              }}
                              className="opacity-0 group-hover/folder:opacity-100 p-1 text-slate-400 hover:text-slate-700 rounded"
                              title="Đổi tên thư mục"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  confirm(
                                    `Xóa thư mục "${folder.name}"? Các tài liệu bên trong sẽ chuyển về thư mục gốc.`
                                  )
                                ) {
                                  onDeleteFolder(folder.id);
                                }
                              }}
                              className="opacity-0 group-hover/folder:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Xóa thư mục"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Documents List */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>Danh sách tài liệu ({filteredDocs.length})</span>
                {activeFolderFilter === 'trash' && trashDocs.length > 0 && (
                  <button
                    onClick={onEmptyTrash}
                    className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    Dọn rác
                  </button>
                )}
              </div>

              {filteredDocs.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <p>{t.noDocsFound}</p>
                </div>
              ) : (
                filteredDocs.map((doc) => {
                  const isCurrent = doc.id === currentDocId;
                  const isMenuOpen = openDocMenuId === doc.id;

                  return (
                    <div
                      key={doc.id}
                      onClick={() => onSelectDoc(doc.id)}
                      className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer border ${
                        isCurrent
                          ? 'bg-white text-indigo-900 font-semibold border-indigo-200 shadow-sm ring-1 ring-indigo-50'
                          : 'border-transparent text-slate-700 hover:bg-slate-200/50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isCurrent ? 'text-indigo-600' : 'text-slate-400'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-slate-900">
                            {doc.title || 'Tài liệu không tên'}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>
                              {new Date(doc.updatedAt).toLocaleDateString(undefined, {
                                month: 'numeric',
                                day: 'numeric',
                              })}
                            </span>
                            {doc.isPinned && (
                              <span className="text-amber-500 font-semibold">★ Ghim</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Doc action popup toggle */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDocMenuId(isMenuOpen ? null : doc.id);
                          }}
                          className={`p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-opacity ${
                            isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1 text-slate-700 shadow-xl z-50 animate-in fade-in zoom-in-95 text-xs"
                          >
                            {!doc.isTrash ? (
                              <>
                                <button
                                  onClick={() => {
                                    onPinDoc(doc.id, !doc.isPinned);
                                    setOpenDocMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-left cursor-pointer"
                                >
                                  {doc.isPinned ? (
                                    <>
                                      <PinOff className="w-3.5 h-3.5 text-amber-500" />
                                      <span>Bỏ ghim</span>
                                    </>
                                  ) : (
                                    <>
                                      <Pin className="w-3.5 h-3.5 text-amber-500" />
                                      <span>Ghim lên đầu</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => {
                                    onDuplicateDoc(doc.id);
                                    setOpenDocMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-left cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Nhân bản</span>
                                </button>

                                <div className="my-1 border-t border-slate-100" />

                                <button
                                  onClick={() => {
                                    onMoveDocToTrash(doc.id);
                                    setOpenDocMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 text-left cursor-pointer font-medium"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Chuyển vào thùng rác</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    onRestoreDoc(doc.id);
                                    setOpenDocMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-left cursor-pointer text-emerald-600 font-medium"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Khôi phục</span>
                                </button>

                                <button
                                  onClick={() => {
                                    onDeleteDocPermanent(doc.id);
                                    setOpenDocMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 text-left cursor-pointer font-medium"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Xóa vĩnh viễn</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* TAB 2: DEDICATED TABLE OF CONTENTS (TAB OF CONTENT) */}
      {sidebarTab === 'toc' && (
        <div className="flex-1 flex flex-col min-h-0 text-xs">
          {/* TOC Top Action Bar */}
          <div className="p-3 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Mục lục hiện tại ({toc.length})
              </span>
              {toc.length > 0 && (
                <button
                  onClick={handleCopyTocOutline}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  title="Sao chép dàn ý Markdown"
                >
                  {copiedToc ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Chép dàn ý</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* TOC Search */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus-within:border-indigo-400 transition-colors">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={tocSearchQuery}
                onChange={(e) => setTocSearchQuery(e.target.value)}
                placeholder="Tìm đề mục..."
                className="w-full bg-transparent outline-none text-xs text-slate-800 placeholder-slate-400"
              />
              {tocSearchQuery && (
                <button
                  onClick={() => setTocSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* TOC Headings List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {toc.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Hash className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-600">Chưa có tiêu đề</p>
                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed px-4">
                  Dùng ký hiệu #, ## hoặc ### trong bài viết để tự động tạo cấu trúc mục lục.
                </p>
              </div>
            ) : filteredToc.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Không tìm thấy đề mục phù hợp với "{tocSearchQuery}"
              </div>
            ) : (
              filteredToc.map((item, idx) => (
                <button
                  key={`${item.id}-${idx}`}
                  onClick={() => {
                    if (onSelectHeading) onSelectHeading(item.id, item.text);
                  }}
                  className="w-full text-left rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:text-indigo-700 hover:bg-indigo-50/80 transition-all flex items-center gap-1.5 group cursor-pointer border border-transparent hover:border-indigo-100"
                  style={{ paddingLeft: `${Math.max(6, (item.level - 1) * 12 + 6)}px` }}
                >
                  <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-indigo-600 transition-colors bg-slate-200/70 group-hover:bg-indigo-100 px-1 py-0.2 rounded shrink-0">
                    H{item.level}
                  </span>
                  <span className="truncate flex-1 font-medium">{item.text}</span>
                  <ChevronRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bottom Footer Settings Bar */}
      <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-indigo-600" />
          <span>{translations[language].nav.settings}</span>
        </button>

        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
          <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
          <span>Local IndexedDB</span>
        </div>
      </div>
    </aside>
  );
};
