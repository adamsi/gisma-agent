import React, { useState, useEffect, useCallback } from 'react';
import { IconX, IconDeviceFloppy, IconEye, IconFile } from '@tabler/icons-react';
import { DocumentEntity } from '@/types/ingestion';
import LoadingSpinner from '@/components/Global/LoadingSpinner';

interface DocumentViewerProps {
  document: DocumentEntity | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (content: string) => Promise<void>;
}

enum FileType {
  PDF = 'pdf',
  IMAGE = 'image',
  TEXT = 'text',
  UNSUPPORTED = 'unsupported',
}

const getFileType = (contentType: string | null | undefined): FileType => {
  if (!contentType) return FileType.TEXT;

  if (contentType.includes('pdf')) {
    return FileType.PDF;
  }

  if (contentType.startsWith('image/')) {
    return FileType.IMAGE;
  }

  if (
    contentType.startsWith('text/') ||
    contentType.includes('json') ||
    contentType.includes('xml') ||
    contentType.includes('javascript') ||
    contentType.includes('css') ||
    contentType.includes('html')
  ) {
    return FileType.TEXT;
  }

  return FileType.UNSUPPORTED;
};

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  isOpen,
  onClose,
  onSave,
}) => {
  const [documentContent, setDocumentContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileType = document ? getFileType(document.contentType) : FileType.TEXT;
  const isEditable = fileType === FileType.TEXT && !!onSave;
  const hasChanges = documentContent !== originalContent;

  const loadTextContent = useCallback(async () => {
    if (!document) return;

    setIsLoading(true);
    try {
      const response = await fetch(document.url);
      if (response.ok) {
        const content = await response.text();
        setDocumentContent(content);
        setOriginalContent(content);
      } else {
        setDocumentContent('');
        setOriginalContent('');
      }
    } catch (error) {
      console.error('Failed to load document content:', error);
      setDocumentContent('');
      setOriginalContent('');
    } finally {
      setIsLoading(false);
    }
  }, [document]);

  useEffect(() => {
    if (!isOpen || !document) {
      return;
    }

    // Reset state when opening a new document
    setDocumentContent('');
    setOriginalContent('');
    setIsLoading(false);
    setIsSaving(false);

    // Only fetch content for text files
    if (fileType === FileType.TEXT) {
      loadTextContent();
    }
  }, [isOpen, document?.id, fileType, loadTextContent]);

  const handleSave = async () => {
    if (!onSave || !hasChanges) return;

    setIsSaving(true);
    try {
      await onSave(documentContent);
      setOriginalContent(documentContent);
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !document) {
    return null;
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <LoadingSpinner />
        </div>
      );
    }

    switch (fileType) {
      case FileType.PDF:
        return (
          <iframe
            src={document.url}
            className="w-full h-full border-0 rounded-lg bg-white"
            title={document.name}
          />
        );

      case FileType.IMAGE:
        return (
          <div className="w-full h-full flex items-center justify-center bg-black/50 rounded-lg overflow-hidden">
            <img
              src={document.url}
              alt={document.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        );

      case FileType.TEXT:
        return (
          <textarea
            value={documentContent}
            onChange={(e) => setDocumentContent(e.target.value)}
            className="w-full h-full p-3 sm:p-6 bg-black/50 border border-white/20 rounded-lg text-white font-mono text-xs sm:text-base resize-none focus:outline-none focus:border-blue-500/50"
            spellCheck={false}
            placeholder="Document content will be loaded here..."
          />
        );

      default:
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black/50 rounded-lg p-6">
            <IconFile className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-white text-lg font-medium mb-2">Preview not available</p>
            <p className="text-blue-200/70 text-sm mb-4 text-center">
              This file type ({document.contentType || 'unknown'}) cannot be previewed
            </p>
            <a
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-200"
            >
              Open in new tab
            </a>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative bg-black/90 backdrop-blur-2xl rounded-xl sm:rounded-2xl border border-white/10 p-4 sm:p-6 w-full sm:w-[50vw] h-[85vh] sm:h-[80vh] flex flex-col max-w-full">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between mb-3 sm:mb-4 flex-shrink-0 gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <IconEye className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-xl font-bold text-white truncate">
                {document.name}
              </h2>
              <p className="text-xs sm:text-sm text-blue-200/70 truncate">
                {document.contentType || 'Unknown type'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isEditable && (
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                  !hasChanges || isSaving
                    ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500 hover:to-emerald-500 shadow-lg hover:shadow-xl'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <IconDeviceFloppy className="w-4 h-4" />
                    <span>Save</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-500/20 rounded-xl transition-all duration-200"
            >
              <IconX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-black/30 rounded-lg sm:rounded-xl p-3 sm:p-4 min-h-0 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;

