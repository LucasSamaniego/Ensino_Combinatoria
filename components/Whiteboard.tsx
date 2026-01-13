
import React, { useRef, useEffect, useState } from 'react';

const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match parent
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        ctx.lineCap = 'round';
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        // Background
        ctx.fillStyle = '#0f172a'; // slate-900
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="flex-grow flex flex-col relative bg-slate-900 overflow-hidden">
      {/* Floating Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/80 backdrop-blur-md border border-slate-700 p-2 rounded-xl flex items-center gap-4 z-10 shadow-2xl">
        <div className="flex gap-1">
          {['#ffffff', '#38bdf8', '#fbbf24', '#f87171', '#4ade80'].map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="h-4 w-px bg-slate-700"></div>
        <input 
          type="range" min="1" max="20" value={brushSize} 
          onChange={(e) => setBrushSize(parseInt(e.target.value))}
          className="w-24 accent-indigo-500"
        />
        <button onClick={clearCanvas} className="text-xs font-bold text-slate-400 hover:text-white uppercase">Limpar</button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="cursor-crosshair flex-grow"
      />
    </div>
  );
};

export default Whiteboard;
