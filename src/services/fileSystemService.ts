import { downloadBlob } from './exportService';

export interface OpenedFileResult {
  filename: string;
  content: string;
  fileHandle?: FileSystemFileHandle;
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
}

export async function openLocalMarkdownFile(): Promise<OpenedFileResult | null> {
  if (isFileSystemAccessSupported()) {
    try {
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Markdown Files (*.md, *.markdown, *.txt)',
            accept: {
              'text/markdown': ['.md', '.markdown'],
              'text/plain': ['.txt'],
            },
          },
        ],
        multiple: false,
      });

      const file = await fileHandle.getFile();
      const content = await file.text();
      return {
        filename: file.name,
        content,
        fileHandle,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') return null;
      console.warn('File system picker cancelled or failed, falling back', err);
    }
  }

  // Fallback for browsers without showOpenFilePicker
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,.txt';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const content = await file.text();
      resolve({
        filename: file.name,
        content,
      });
    };
    input.click();
  });
}

export async function saveLocalMarkdownFile(
  content: string,
  suggestedName: string,
  existingHandle?: FileSystemFileHandle
): Promise<{ success: boolean; handle?: FileSystemFileHandle; filename?: string }> {
  const filename = suggestedName.endsWith('.md') ? suggestedName : `${suggestedName}.md`;

  if (isFileSystemAccessSupported()) {
    try {
      let handle = existingHandle;
      if (!handle) {
        handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'Markdown File (*.md)',
              accept: { 'text/markdown': ['.md'] },
            },
          ],
        });
      }

      if (handle) {
        const writable = await (handle as any).createWritable();
        await writable.write(content);
        await writable.close();
        const file = await (handle as any).getFile();
        return { success: true, handle, filename: file.name };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return { success: false };
      console.warn('Save file picker failed, falling back to download', err);
    }
  }

  // Fallback: download blob
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, filename);
  return { success: true, filename };
}

export async function openLocalFile(): Promise<{ name: string; content: string } | null> {
  const res = await openLocalMarkdownFile();
  if (!res) return null;
  return { name: res.filename, content: res.content };
}

export async function saveToLocalFile(name: string, content: string): Promise<boolean> {
  const res = await saveLocalMarkdownFile(content, name);
  return res.success;
}
