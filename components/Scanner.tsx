
import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, RefreshCw } from 'lucide-react';

interface ScannerProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

type ScanStage = 'camera' | 'crop';

const Scanner: React.FC<ScannerProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stage, setStage] = useState<ScanStage>('camera');
  const [imgNaturalDim, setImgNaturalDim] = useState({ w: 1, h: 1 });
  
  // Crop percentages (0 to 100)
  const [crop, setCrop] = useState({ x: 10, y: 10, w: 80, h: 80 });
  const [activeHandle, setActiveHandle] = useState<string | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false 
        });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access camera. Please check permissions.");
        onClose();
      }
    }
    if (stage === 'camera') startCamera();
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [stage]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        
        const img = new Image();
        img.onload = () => {
          setImgNaturalDim({ w: img.naturalWidth, h: img.naturalHeight });
          setCapturedImage(dataUrl);
          setStage('crop');
          stream?.getTracks().forEach(t => t.stop());
        };
        img.src = dataUrl;
      }
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!activeHandle || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const curX = ((clientX - rect.left) / rect.width) * 100;
    const curY = ((clientY - rect.top) / rect.height) * 100;

    setCrop(prev => {
      let { x, y, w, h } = prev;
      const minSize = 10;
      const right = x + w;
      const bottom = y + h;

      switch (activeHandle) {
        case 'tl':
          x = Math.min(curX, right - minSize);
          y = Math.min(curY, bottom - minSize);
          w = right - x;
          h = bottom - y;
          break;
        case 'tr':
          w = Math.max(minSize, curX - x);
          y = Math.min(curY, bottom - minSize);
          h = bottom - y;
          break;
        case 'bl':
          x = Math.min(curX, right - minSize);
          w = right - x;
          h = Math.max(minSize, curY - y);
          break;
        case 'br':
          w = Math.max(minSize, curX - x);
          h = Math.max(minSize, curY - y);
          break;
        case 't':
          y = Math.min(curY, bottom - minSize);
          h = bottom - y;
          break;
        case 'b':
          h = Math.max(minSize, curY - y);
          break;
        case 'l':
          x = Math.min(curX, right - minSize);
          w = right - x;
          break;
        case 'r':
          w = Math.max(minSize, curX - x);
          break;
      }

      x = Math.max(0, Math.min(x, 100));
      y = Math.max(0, Math.min(y, 100));
      w = Math.max(minSize, Math.min(w, 100 - x));
      h = Math.max(minSize, Math.min(h, 100 - y));

      return { x, y, w, h };
    });
  };

  const finalizeScan = () => {
    if (capturedImage && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        
        const cropX = (crop.x / 100) * img.naturalWidth;
        const cropY = (crop.y / 100) * img.naturalHeight;
        const cropW = (crop.w / 100) * img.naturalWidth;
        const cropH = (crop.h / 100) * img.naturalHeight;

        canvas.width = cropW;
        canvas.height = cropH;
        ctx.filter = 'contrast(1.1) saturate(1.1) brightness(1.02)'; 
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        
        const finalBase64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
        onCapture(finalBase64);
      };
      img.src = capturedImage;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[200] bg-black flex flex-col font-sans select-none overflow-hidden"
      onMouseMove={handleMove}
      onMouseUp={() => setActiveHandle(null)}
      onTouchMove={handleMove}
      onTouchEnd={() => setActiveHandle(null)}
    >
      {/* Header - Fixed height */}
      <div className="flex-none p-6 flex justify-between items-center bg-slate-900 border-b border-white/5">
        <button onClick={onClose} className="p-3 bg-white/10 rounded-2xl text-white">
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-white font-black text-xs uppercase tracking-widest">
            {stage === 'camera' ? 'Capture' : 'Refine Selection'}
          </h2>
          <div className="w-8 h-1 bg-indigo-500 rounded-full mt-1" />
        </div>
        <div className="w-11" />
      </div>

      {/* Main View - Flexible space */}
      <div className="flex-1 flex items-center justify-center p-6 bg-black overflow-hidden">
        {stage === 'camera' ? (
          <div className="relative w-full h-full max-w-lg rounded-[2.5rem] overflow-hidden border-2 border-white/10 shadow-2xl">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
              <div className="w-full h-full border-2 border-indigo-500/30 rounded-2xl relative overflow-hidden">
                <div className="absolute left-0 w-full h-1 bg-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.8)] animate-scan-line" />
              </div>
            </div>
          </div>
        ) : (
          <div 
            ref={containerRef} 
            className="relative bg-slate-900 rounded-2xl shadow-2xl ring-1 ring-white/10"
            style={{ 
              width: '100%', 
              maxWidth: '450px',
              maxHeight: '100%',
              aspectRatio: `${imgNaturalDim.w} / ${imgNaturalDim.h}` 
            }}
          >
            <img src={capturedImage!} alt="Captured" className="w-full h-full object-contain pointer-events-none rounded-2xl" />
            
            <div 
              className="absolute border-2 border-indigo-400 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
              style={{ 
                left: `${crop.x}%`, 
                top: `${crop.y}%`, 
                width: `${crop.w}%`, 
                height: `${crop.h}%` 
              }}
            >
              {/* Corner Handles - Larger hit area */}
              <div onMouseDown={(e) => {e.stopPropagation(); setActiveHandle('tl')}} onTouchStart={(e) => {e.stopPropagation(); setActiveHandle('tl')}} className="absolute -top-5 -left-5 w-10 h-10 flex items-center justify-center cursor-nw-resize z-50">
                <div className="w-5 h-5 bg-white border-2 border-indigo-500 rounded-full shadow-lg" />
              </div>
              <div onMouseDown={(e) => {e.stopPropagation(); setActiveHandle('tr')}} onTouchStart={(e) => {e.stopPropagation(); setActiveHandle('tr')}} className="absolute -top-5 -right-5 w-10 h-10 flex items-center justify-center cursor-ne-resize z-50">
                <div className="w-5 h-5 bg-white border-2 border-indigo-500 rounded-full shadow-lg" />
              </div>
              <div onMouseDown={(e) => {e.stopPropagation(); setActiveHandle('bl')}} onTouchStart={(e) => {e.stopPropagation(); setActiveHandle('bl')}} className="absolute -bottom-5 -left-5 w-10 h-10 flex items-center justify-center cursor-sw-resize z-50">
                <div className="w-5 h-5 bg-white border-2 border-indigo-500 rounded-full shadow-lg" />
              </div>
              <div onMouseDown={(e) => {e.stopPropagation(); setActiveHandle('br')}} onTouchStart={(e) => {e.stopPropagation(); setActiveHandle('br')}} className="absolute -bottom-5 -right-5 w-10 h-10 flex items-center justify-center cursor-se-resize z-50">
                <div className="w-5 h-5 bg-white border-2 border-indigo-500 rounded-full shadow-lg" />
              </div>

              {/* Edge Handles - Full span for easy vertical grabbing */}
              <div onMouseDown={(e) => {e.stopPropagation(); setActiveHandle('t')}} onTouchStart={(e) => {e.stopPropagation(); setActiveHandle('t')}} className="absolute -top-4 left-0 right-0 h-10 flex items-center justify-center cursor-n-resize z-40">
                <div className="w-16 h-1.5 bg-indigo-500 rounded-full opacity-70" />
              </div>
              <div onMouseDown={(e) => {e.stopPropagation(); setActiveHandle('b')}} onTouchStart={(e) => {e.stopPropagation(); setActiveHandle('b')}} className="absolute -bottom-4 left-0 right-0 h-10 flex items-center justify-center cursor-s-resize z-40">
                <div className="w-16 h-1.5 bg-indigo-500 rounded-full opacity-70" />
              </div>
              <div onMouseDown={(e) => {e.stopPropagation(); setActiveHandle('l')}} onTouchStart={(e) => {e.stopPropagation(); setActiveHandle('l')}} className="absolute top-0 bottom-0 -left-4 w-10 flex items-center justify-center cursor-w-resize z-40">
                <div className="w-1.5 h-16 bg-indigo-500 rounded-full opacity-70" />
              </div>
              <div onMouseDown={(e) => {e.stopPropagation(); setActiveHandle('r')}} onTouchStart={(e) => {e.stopPropagation(); setActiveHandle('r')}} className="absolute top-0 bottom-0 -right-4 w-10 flex items-center justify-center cursor-e-resize z-40">
                <div className="w-1.5 h-16 bg-indigo-500 rounded-full opacity-70" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Fixed height, ensures buttons are never in the image space */}
      <div className="flex-none p-8 flex items-center justify-center gap-4 bg-slate-900 border-t border-white/5">
        {stage === 'camera' ? (
          <button 
            onClick={handleCapture}
            className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform p-1 ring-4 ring-white/10"
          >
            <div className="w-full h-full border-2 border-slate-900 rounded-full flex items-center justify-center">
                <Camera className="w-8 h-8 text-slate-900" />
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-4 w-full max-w-sm">
            <button 
              onClick={() => setStage('camera')}
              className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-black flex items-center justify-center gap-2 border border-white/5"
            >
              <RefreshCw className="w-4 h-4" /> Retake
            </button>
            <button 
              onClick={finalizeScan}
              className="flex-[1.5] py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg"
            >
              <Check className="w-5 h-5" /> Save Selection
            </button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan-line {
          0% { top: 0%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-line { animation: scan-line 3s linear infinite; }
      `}} />
    </div>
  );
};

export default Scanner;
