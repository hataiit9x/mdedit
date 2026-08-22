import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Copy, Check, AlertCircle, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface MermaidDiagramProps {
  code: string;
  isDark?: boolean;
}

export default function MermaidDiagram({ code, isDark = false }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let isMounted = true;

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit',
        themeVariables: {
          darkMode: false,
          background: '#ffffff',
          primaryColor: '#6366f1',
          primaryTextColor: '#0f172a',
          primaryBorderColor: '#4f46e5',
          lineColor: '#64748b',
          secondaryColor: '#f1f5f9',
          tertiaryColor: '#f8fafc',
        },
      });

      const id = 'mermaid-' + Math.random().toString(36).substring(2, 9);
      mermaid
        .render(id, code.trim())
        .then(({ svg }) => {
          if (isMounted) {
            setSvgContent(svg);
            setError(null);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(err?.message || 'Lỗi cú pháp sơ đồ Mermaid');
          }
        });
    } catch (e: any) {
      if (isMounted) {
        setError(e?.message || 'Không thể hiển thị sơ đồ Mermaid');
      }
    }

    return () => {
      isMounted = false;
    };
  }, [code, isDark]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="my-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
        <div className="flex items-center gap-2 font-bold mb-1">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>Lỗi cú pháp Mermaid</span>
        </div>
        <p className="font-mono opacity-90 mb-2">{error}</p>
        <pre className="p-2.5 rounded-lg bg-white border border-rose-200 font-mono overflow-x-auto text-slate-800">
          {code}
        </pre>
      </div>
    );
  }

  return (
    <div className="my-6 rounded-2xl border border-slate-200 bg-white p-4 overflow-hidden group shadow-sm">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs text-slate-500">
        <span className="font-bold tracking-wider uppercase text-[10px] text-slate-600">
          Sơ đồ Mermaid
        </span>
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}
            className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Phóng to"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
            className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Đặt lại kích thước"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors ml-1 cursor-pointer font-medium"
            title="Sao chép mã Mermaid"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex items-center justify-center overflow-x-auto py-3 transition-transform duration-200"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
}
