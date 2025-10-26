import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { getUser } from '@/store/slices/authSlice';
import { 
  fetchRootFolder, 
  createFolder, 
  deleteDocuments,
  deleteFolders,
  setCurrentFolder,
  clearError,
  clearSuccess
} from '@/store/slices/uploadSlice';
import LoadingSpinner from '@/components/Global/LoadingSpinner';
import ParticlesBackground from '@/components/Global/Particles';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  IconArrowLeft, 
  IconUpload, 
  IconFolder, 
  IconFile, 
  IconChevronRight,
  IconX,
  IconTrash,
  IconPlus,
  IconCheck,
  IconDeviceFloppy,
  IconEye
} from '@tabler/icons-react';
import { FolderEntity, DocumentEntity } from '@/types/ingestion';
import { FileUpload } from '@/components/Upload';

interface BreadcrumbItem {
  id: string;
  name: string;
}

const AdminUpload: React.FC = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, isAdmin, loading } = useAppSelector((state) => state.auth);
  const { rootFolder, currentFolder, loading: uploadLoading, deleting, error, success } = useAppSelector((state) => state.upload);
  
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: 'root', name: '/' }]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    itemId: string;
    itemType: 'folder' | 'file';
  }>({
    visible: false,
    x: 0,
    y: 0,
    itemId: '',
    itemType: 'file'
  });
  const [viewerDocument, setViewerDocument] = useState<DocumentEntity | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      dispatch(getUser());
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      router.push('/');
    }
  }, [loading, user, isAdmin, router]);

  useEffect(() => {
    if (user && isAdmin && !rootFolder) {
      dispatch(fetchRootFolder());
    }
  }, [dispatch, user, isAdmin, rootFolder]);

  useEffect(() => {
    if (currentFolder) {
      // Update breadcrumbs when current folder changes
      const path = buildPathToFolder(currentFolder.id, rootFolder!);
      if (path) {
        setBreadcrumbs(path);
      }
    }
  }, [currentFolder, rootFolder]);

  // Auto-clear success messages after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        dispatch(clearSuccess());
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [success, dispatch]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        closeContextMenu();
      }
    };

    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.visible]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to exit selection mode
      if (e.key === 'Escape') {
        if (isSelectionMode) {
          setSelectedItems([]);
          setIsSelectionMode(false);
        }
        if (contextMenu.visible) {
          closeContextMenu();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode, contextMenu.visible]);

  const navigateToFolder = (folder: FolderEntity) => {
    dispatch(setCurrentFolder(folder));
    setSelectedItems([]);
    setIsSelectionMode(false);
  };

  const findFolderById = (folderId: string, folder: FolderEntity): FolderEntity | null => {
    if (folder.id === folderId) {
      return folder;
    }
    
    if (folder.childrenFolders) {
      for (const childFolder of folder.childrenFolders) {
        const found = findFolderById(folderId, childFolder);
        if (found) {
          return found;
        }
      }
    }
    
    return null;
  };

  const buildPathToFolder = (targetFolderId: string, currentFolder: FolderEntity, path: BreadcrumbItem[] = []): BreadcrumbItem[] | null => {
    // Add current folder to path
    const newPath = [...path, { id: currentFolder.id, name: currentFolder.name }];
    
    // If this is the target folder, return the path
    if (currentFolder.id === targetFolderId) {
      return newPath;
    }
    
    // Search in children folders
    if (currentFolder.childrenFolders) {
      for (const childFolder of currentFolder.childrenFolders) {
        const result = buildPathToFolder(targetFolderId, childFolder, newPath);
        if (result) {
          return result;
        }
      }
    }
    
    return null;
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === 0) {
      dispatch(setCurrentFolder(rootFolder!));
      setBreadcrumbs([{ id: 'root', name: '/' }]);
    } else {
      const targetBreadcrumb = breadcrumbs[index];
      const targetFolder = findFolderById(targetBreadcrumb.id, rootFolder!);
      
      if (targetFolder) {
        dispatch(setCurrentFolder(targetFolder));
        setBreadcrumbs(breadcrumbs.slice(0, index + 1));
      }
    }
    setSelectedItems([]);
  };

  const getFileIcon = (contentType: string | null | undefined) => {
    if (!contentType) {
      return <IconFile className="w-6 h-6 text-blue-300" />;
    }
    
    if (contentType.startsWith('image/')) {
      return <IconFile className="w-6 h-6 text-green-400" />;
    } else if (contentType.includes('pdf')) {
      return <IconFile className="w-6 h-6 text-red-400" />;
    } else if (contentType.includes('word') || contentType.includes('document')) {
      return <IconFile className="w-6 h-6 text-blue-400" />;
    } else if (contentType.includes('sheet') || contentType.includes('excel')) {
      return <IconFile className="w-6 h-6 text-green-400" />;
    } else if (contentType.includes('presentation') || contentType.includes('powerpoint')) {
      return <IconFile className="w-6 h-6 text-orange-400" />;
    } else if (contentType.includes('text')) {
      return <IconFile className="w-6 h-6 text-gray-400" />;
    }
    return <IconFile className="w-6 h-6 text-blue-300" />;
  };

  const formatFileSize = (url: string): string => {
    // Mock file sizes for demonstration
    const sizes = ['2.3 MB', '1.8 MB', '4.1 MB', '856 KB', '2.1 MB', '3.4 MB', '1.2 MB', '512 KB'];
    return sizes[Math.floor(Math.random() * sizes.length)];
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItems(prev => {
      const newSelection = prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];
      
      // Enter selection mode when any item is selected
      if (newSelection.length > 0 && !isSelectionMode) {
        setIsSelectionMode(true);
      }
      // Exit selection mode when no items are selected
      else if (newSelection.length === 0 && isSelectionMode) {
        setIsSelectionMode(false);
      }
      
      return newSelection;
    });
  };
  
  // Update selection mode based on selected items
  useEffect(() => {
    if (selectedItems.length > 0 && !isSelectionMode) {
      setIsSelectionMode(true);
    } else if (selectedItems.length === 0 && isSelectionMode) {
      setIsSelectionMode(false);
    }
  }, [selectedItems, isSelectionMode]);

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0 || !currentFolder) return;
    
    dispatch(clearSuccess()); // Clear any existing success messages
    try {
      // Separate selected items into documents and folders
      const selectedDocuments = selectedItems.filter(itemId => 
        currentFolder.childrenDocuments?.some(doc => doc.id === itemId)
      );
      const selectedFolders = selectedItems.filter(itemId => 
        currentFolder.childrenFolders?.some(folder => folder.id === itemId)
      );
      
      // Delete documents and folders separately
      if (selectedDocuments.length > 0) {
        await dispatch(deleteDocuments(selectedDocuments)).unwrap();
      }
      if (selectedFolders.length > 0) {
        await dispatch(deleteFolders(selectedFolders)).unwrap();
      }
      
      setSelectedItems([]);
      setIsSelectionMode(false);
      // Refresh the folder structure after deletion
      dispatch(fetchRootFolder());
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleViewDocument = async (document: DocumentEntity) => {
    setViewerDocument(document);
    setIsViewerOpen(true);
    setIsEditing(true); // Start in edit mode
    setIsSaving(false);
    
    try {
      // Fetch document content directly from S3
      const response = await fetch(document.url);
      
      if (response.ok) {
        const content = await response.text();
        setDocumentContent(content);
      } else {
        setDocumentContent(''); // Start with empty content
      }
    } catch (error) {
      console.error('Failed to load document content:', error);
      setDocumentContent(''); // Start with empty content
    }
  };

  const handleSaveDocument = async () => {
    if (!viewerDocument) return;
    
    setIsSaving(true);
    dispatch(clearSuccess());
    
    try {
      // Create a new File object from the edited content
      const blob = new Blob([documentContent], { type: viewerDocument.contentType || 'text/plain' });
      const file = new File([blob], viewerDocument.name, { type: viewerDocument.contentType || 'text/plain' });
      
      // Upload/replace the file using the upload API
      const formData = new FormData();
      formData.append('files', file);
      
      const documents = [{
        documentId: viewerDocument.id,
        parentFolderId: currentFolder?.id || 'root'
      }];
      
      const documentsBlob = new Blob([JSON.stringify(documents)], { type: 'application/json' });
      formData.append('documents', documentsBlob, 'documents');
      
      await fetch('/api/ingestion/documents/upload', {
        method: 'POST',
        headers: {
          // Don't set Content-Type, let the browser set it with boundary
        },
        credentials: 'include',
        body: formData
      });
      
      setIsSaving(false);
      setIsEditing(false);
      setIsViewerOpen(false);
      
      // Refresh folder structure
      dispatch(fetchRootFolder());
    } catch (error) {
      console.error('Failed to save document:', error);
      setIsSaving(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    dispatch(clearSuccess()); // Clear any existing success messages
    try {
      await dispatch(createFolder({
        name: newFolderName.trim(),
        parentFolderId: currentFolder?.id || 'root'
      })).unwrap();
      setNewFolderName('');
      setIsCreateFolderModalOpen(false);
      // Refresh the folder structure after creation
      dispatch(fetchRootFolder());
    } catch (error) {
      console.error('Create folder failed:', error);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, itemId: string, itemType: 'folder' | 'file') => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      itemId,
      itemType
    });
  };

  const handleContextMenuAction = (action: string) => {
    const { itemId, itemType } = contextMenu;
    
    switch (action) {
      case 'delete':
        setSelectedItems([itemId]);
        handleDeleteSelected();
        break;
      case 'select':
        handleItemSelect(itemId);
        break;
      case 'open':
        if (itemType === 'folder') {
          const folder = currentFolder?.childrenFolders?.find(f => f.id === itemId);
          if (folder) {
            navigateToFolder(folder);
          }
        }
        break;
    }
    
    setContextMenu({ ...contextMenu, visible: false });
  };

  const closeContextMenu = () => {
    setContextMenu({ ...contextMenu, visible: false });
  };

  if (!user || !isAdmin) {
    return null;
  }

  if (!currentFolder) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Admin - Document Management | Gisma Agent</title>
        <meta name="description" content="Admin document management interface" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-black relative overflow-hidden">
        {/* Particles Background */}
        <div className="absolute inset-0 z-0">
          <ParticlesBackground />
        </div>

        {/* Decorative Background Orbs */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute top-1/3 -right-16 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-2xl" />
        </div>

        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 z-0 bg-grid opacity-30 mask-radial-faded" />
        
        {/* Header */}
        <div className="relative z-10 bg-black/30 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/')}
                  className="p-2 text-blue-200 hover:text-white hover:bg-blue-500/20 rounded-lg transition-all duration-200"
                >
                  <IconArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                    <img
                      src="/sa-logo.png"
                      alt="Gisma Agent Logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">Document Management</h1>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-300">Admin Access</span>
              </div>
            </div>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="relative z-10 bg-black/20 backdrop-blur-sm border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.id}>
                  <button
                    onClick={() => navigateToBreadcrumb(index)}
                    className={`px-3 py-1 rounded-lg transition-all duration-200 ${
                      index === breadcrumbs.length - 1
                        ? 'text-white bg-blue-500/20 ring-1 ring-blue-400/30'
                        : 'text-blue-200 hover:text-white hover:bg-blue-500/10'
                    }`}
                  >
                    {crumb.name}
                  </button>
                  {index < breadcrumbs.length - 1 && (
                    <IconChevronRight className="w-4 h-4 text-blue-300/60" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Action Bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <IconPlus className="w-4 h-4" />
                  <span>Upload Files</span>
                </button>
                
                <button
                  onClick={() => setIsCreateFolderModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <IconFolder className="w-4 h-4" />
                  <span>New Folder</span>
                </button>
                
                {selectedItems.length > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    disabled={deleting}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600/20 text-red-300 border border-red-500/30 rounded-xl hover:bg-red-600/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <IconTrash className="w-4 h-4" />
                        <span>Delete ({selectedItems.length})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              
              <div className="text-sm text-blue-200/70">
                {currentFolder.childrenFolders?.length || 0} folders, {currentFolder.childrenDocuments?.length || 0} files
                {isSelectionMode && (
                  <span className="ml-2 px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs">
                    Selection Mode • Press Esc to exit
                  </span>
                )}
              </div>
            </div>

            {/* File System Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {/* Folders */}
              {currentFolder.childrenFolders?.map((folder) => (
                <div
                  key={folder.id}
                  className={`group relative bg-black/30 backdrop-blur-xl rounded-2xl p-4 border transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10 ${
                    selectedItems.includes(folder.id)
                      ? 'border-blue-400/50 bg-blue-500/10'
                      : 'border-white/10 hover:border-blue-400/30'
                  }`}
                  onClick={() => {
                    if (isSelectionMode) {
                      handleItemSelect(folder.id);
                    } else {
                      navigateToFolder(folder);
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, folder.id, 'folder')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-indigo-500/30 transition-all duration-300">
                      <IconFolder className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate group-hover:text-blue-200 transition-colors duration-200">
                        {folder.name}
                      </h3>
                      <p className="text-xs text-blue-200/60 mt-1">
                        {(folder.childrenFolders?.length || 0) + (folder.childrenDocuments?.length || 0)} items
                      </p>
                    </div>
                  </div>
                  
                  {/* Selection indicator */}
                  {selectedItems.includes(folder.id) && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              ))}

              {/* Files */}
              {currentFolder.childrenDocuments?.map((document) => (
                <div
                  key={document.id}
                  className={`group relative bg-black/30 backdrop-blur-xl rounded-2xl p-4 border transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10 ${
                    selectedItems.includes(document.id)
                      ? 'border-blue-400/50 bg-blue-500/10'
                      : 'border-white/10 hover:border-blue-400/30'
                  }`}
                  onClick={() => {
                    if (isSelectionMode) {
                      handleItemSelect(document.id);
                    } else {
                      handleViewDocument(document);
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, document.id, 'file')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-xl flex items-center justify-center group-hover:from-gray-500/30 group-hover:to-gray-600/30 transition-all duration-300">
                      {getFileIcon(document.contentType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate group-hover:text-blue-200 transition-colors duration-200">
                        {document.name}
                      </h3>
                      <p className="text-xs text-blue-200/60 mt-1">
                        {formatFileSize(document.url)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Selection indicator */}
                  {selectedItems.includes(document.id) && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Empty State */}
            {(!currentFolder.childrenFolders?.length && !currentFolder.childrenDocuments?.length) && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <IconFolder className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Empty Folder</h3>
                <p className="text-blue-200/70 mb-6">This folder doesn't contain any files or folders yet.</p>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Upload Files
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Upload Modal */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsUploadModalOpen(false)} />
            <div className="relative bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6 w-full max-w-2xl max-h-[95vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Upload Files</h2>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-500/20 rounded-lg transition-all duration-200"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>
              <FileUpload className="w-full" parentFolderId={currentFolder.id} />
              
              {/* Current Folder Display */}
              <div className="mt-6 pt-4 border-t border-white/10 text-center">
                <div className="text-sm text-blue-200/70">
                  Current folder: <span className="text-blue-300 font-mono">
                    {breadcrumbs.length === 1 ? '/' : '/' + breadcrumbs.slice(1).map(crumb => crumb.name).join('/')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Folder Modal */}
        {isCreateFolderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCreateFolderModalOpen(false)} />
            <div className="relative bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Create New Folder</h2>
                <button
                  onClick={() => setIsCreateFolderModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-500/20 rounded-lg transition-all duration-200"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">
                    Folder Name
                  </label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name..."
                    className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                    autoFocus
                  />
                </div>
                
                <div className="text-sm text-blue-200/70">
                  Current folder: <span className="text-blue-300 font-mono">
                    {breadcrumbs.length === 1 ? '/' : '/' + breadcrumbs.slice(1).map(crumb => crumb.name).join('/')}
                  </span>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setIsCreateFolderModalOpen(false)}
                    disabled={uploadLoading}
                    className="flex-1 px-4 py-3 bg-gray-600/20 text-gray-300 border border-gray-500/30 rounded-xl hover:bg-gray-600/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim() || uploadLoading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {uploadLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <span>Create Folder</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu.visible && (
          <div
            className="fixed z-50 bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl py-2 min-w-[160px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              {contextMenu.itemType === 'folder' && (
                <button
                  onClick={() => handleContextMenuAction('open')}
                  className="w-full px-4 py-2 text-left text-white hover:bg-blue-500/20 transition-colors duration-200 flex items-center space-x-3"
                >
                  <IconFolder className="w-4 h-4 text-blue-400" />
                  <span>Open</span>
                </button>
              )}
              
              <button
                onClick={() => handleContextMenuAction('select')}
                className="w-full px-4 py-2 text-left text-white hover:bg-blue-500/20 transition-colors duration-200 flex items-center space-x-3"
              >
                <IconCheck className="w-4 h-4 text-green-400" />
                <span>{selectedItems.includes(contextMenu.itemId) ? 'Deselect' : 'Select'}</span>
              </button>
              
              <div className="border-t border-white/10 my-1" />
              
              <button
                onClick={() => handleContextMenuAction('delete')}
                className="w-full px-4 py-2 text-left text-red-300 hover:bg-red-500/20 transition-colors duration-200 flex items-center space-x-3"
              >
                <IconTrash className="w-4 h-4 text-red-400" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {(error || success) && (
          <div className="fixed bottom-4 right-4 z-50 max-w-md">
            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 backdrop-blur-sm">
                <IconX className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-300">Error</p>
                  <p className="text-xs text-red-200/80 mt-1">{error}</p>
                </div>
                <button
                  onClick={() => dispatch(clearError())}
                  className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded-lg transition-colors duration-200"
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {success && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start space-x-3 backdrop-blur-sm">
                <IconCheck className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-300">Success</p>
                  <p className="text-xs text-green-200/80 mt-1">{success}</p>
                </div>
                <button
                  onClick={() => dispatch(clearSuccess())}
                  className="text-green-400 hover:text-green-300 p-1 hover:bg-green-500/10 rounded-lg transition-colors duration-200"
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Document Viewer Modal */}
        {isViewerOpen && viewerDocument && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsViewerOpen(false)} />
            <div className="relative bg-black/90 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <IconEye className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{viewerDocument.name}</h2>
                    <p className="text-sm text-blue-200/70">{viewerDocument.contentType || 'Unknown type'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!isSaving && (
                    <button
                      onClick={handleSaveDocument}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <IconDeviceFloppy className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsViewerOpen(false)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-500/20 rounded-xl transition-all duration-200"
                  >
                    <IconX className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto bg-black/30 rounded-xl border border-white/10 p-4">
                {isSaving ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span className="ml-3 text-white">Saving...</span>
                  </div>
                ) : (
                  <textarea
                    value={documentContent}
                    onChange={(e) => setDocumentContent(e.target.value)}
                    className="w-full h-full min-h-[400px] p-4 bg-black/50 border border-white/20 rounded-xl text-white font-mono text-sm resize-none focus:outline-none focus:border-blue-500/50"
                    spellCheck={false}
                    placeholder="Document content will be loaded here..."
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminUpload;
