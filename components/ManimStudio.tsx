import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Sparkles, Loader2, Play, Info, Monitor } from 'lucide-react';
import MathRenderer from './MathRenderer';

interface AnimationStep {
  type: 'draw' | 'transform' | 'text' | 'graph';
  path?: string;
  targetPath?: string;
  label?: string;
  duration: number;
  delay: number;
}

interface ManimStudioProps {
  isEmbedded?: boolean;
}

const ManimStudio: React.FC<ManimStudioProps> = ({ isEmbedded }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<AnimationStep[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const generateAnimation = async () => {
    if (!prompt) return;
    setLoading(true);
    setSteps([]);
    setIsPlaying(false);

    // Use process.env.API_KEY as per Google GenAI guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `
          Você é um expert no framework Manim (Python).
          Traduza o pedido "${prompt}" em uma sequência de animações matemáticas.
          Retorne um JSON com uma lista de 'steps'.
          Cada step tem: 
          - type: 'draw' (desenha um path SVG), 'transform' (muda um path para outro), 'text' (exibe fórmula)
          - path: Atributo 'd' de um path SVG (coordenadas 0-200)
          - targetPath: Path de destino para 'transform'
          - label: Texto/Fórmula LaTeX se for do tipo 'text'
          - duration: ms
          - delay: ms
          Use fundo escuro estilo 3Blue1Brown.
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ['draw', 'transform', 'text', 'graph'] },
                    path: { type: Type.STRING },
                    targetPath: { type: Type.STRING },
                    label: { type: Type.STRING },
                    duration: { type: Type.NUMBER },
                    delay: { type: Type.NUMBER }
                  }
                }
              }
            }
          }
        }
      });

      const data = JSON.parse(response.text || '{"steps":[]}');
      setSteps(data.steps);
      setTimeout(() => setIsPlaying(true), 500);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar animação. Verifique a API_KEY.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex-grow flex flex-col ${isEmbedded ? '' : 'lg:flex-row'} h-full overflow-hidden`}>
      {/* Sidebar de Controle */}
      <div className={`${isEmbedded ? 'w-full order-2 p-4' : 'w-full lg:w-80 p-6'} bg-slate-900/50 border-r border-slate-800 flex flex-col gap-4 backdrop-blur-sm z-20`}>
        <div>
          <h3 className="text-sky-400 font-bold text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Prompt de Animação
          </h3>
          <div className="flex flex-col gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Animação de nCr com slots..."
              className="w-full h-20 bg-black/60 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:ring-1 focus:ring-sky-500 outline-none resize-none transition-all"
            />
            <button
              onClick={generateAnimation}
              disabled={loading || !prompt}
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {loading ? 'Calculando...' : 'Renderizar Manim'}
            </button>
          </div>
        </div>

        {!isEmbedded && (
          <div className="mt-auto bg-black/40 border border-slate-800 p-3 rounded-xl">
            <h4 className="text-[9px] font-bold text-slate-500 mb-2 flex items-center gap-1 uppercase tracking-tighter">
              <Info className="w-3 h-3" /> Sugestões
            </h4>
            <ul className="text-[9px] text-slate-500 space-y-1.5 list-disc list-inside">
              <li>"Crescimento do fatorial"</li>
              <li>"Diagrama de Venn 3 conjuntos"</li>
            </ul>
          </div>
        )}
      </div>

      {/* Viewport de Animação */}
      <div className={`flex-grow bg-black relative flex items-center justify-center overflow-hidden min-h-[300px] ${isEmbedded ? 'order-1' : ''}`}>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:30px_30px]"></div>
        
        <div ref={containerRef} className="relative z-10 w-[90%] aspect-video flex items-center justify-center">
           {loading ? (
             <div className="text-sky-400 flex flex-col items-center gap-4 animate-pulse">
                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Processing Physics...</span>
             </div>
           ) : isPlaying ? (
             <div className="w-full h-full relative flex items-center justify-center">
                {steps.map((step, i) => (
                  <div 
                    key={i} 
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ 
                      animation: `${step.type === 'text' ? 'fadeIn' : 'drawPath'} ${step.duration}ms ease-out forwards`,
                      animationDelay: `${step.delay}ms`,
                      opacity: 0
                    }}
                  >
                    {step.type === 'text' && step.label && (
                      <MathRenderer text={step.label} className="text-2xl md:text-3xl text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
                    )}
                    {step.type === 'draw' && step.path && (
                      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_0_12px_rgba(56,189,248,0.3)]">
                        <path 
                          d={step.path} 
                          fill="none" 
                          stroke="#38bdf8" 
                          strokeWidth="1.5" 
                          strokeLinecap="round"
                          className="manim-draw-animation"
                          style={{ animationDuration: `${step.duration}ms`, animationDelay: `${step.delay}ms` }}
                        />
                      </svg>
                    )}
                  </div>
                ))}
             </div>
           ) : (
             <div className="text-slate-800 flex flex-col items-center gap-2 opacity-50">
                <Monitor className="w-12 h-12" />
                <p className="font-mono text-[9px] uppercase tracking-widest">Aguardando Input</p>
             </div>
           )}
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes drawPath {
            from { opacity: 1; stroke-dasharray: 1000; stroke-dashoffset: 1000; }
            to { opacity: 1; stroke-dasharray: 1000; stroke-dashoffset: 0; }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
          .manim-draw-animation {
            stroke-dasharray: 1000;
            stroke-dashoffset: 1000;
            animation: drawPath linear forwards;
          }
        `}</style>
      </div>
    </div>
  );
};

export default ManimStudio;