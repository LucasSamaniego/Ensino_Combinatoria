
import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Video, Settings, Monitor, Code, Maximize2, Minimize2, Camera } from 'lucide-react';
import ManimStudio from './ManimStudio';
import LessonPlanner from './LessonPlanner';
import ProbabilityLab from './ProbabilityLab';
import CameraStream from './CameraStream';

type ToolId = 'manim_studio' | 'lesson_planner' | 'probability_lab' | 'tools';

const OnlineClassroom: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [activeTool, setActiveTool] = useState<ToolId>('manim_studio');
  const [showCamera, setShowCamera] = useState(true);

  const tools = [
    { id: 'manim_studio', name: 'Manim Studio', icon: Code, color: 'text-sky-400' },
    { id: 'lesson_planner', name: 'Planejador IA', icon: Sparkles, color: 'text-amber-400' },
    { id: 'probability_lab', name: 'Lab. Probabilidade', icon: Monitor, color: 'text-indigo-400' },
  ];

  return (
    <div className="h-screen bg-black flex flex-col text-slate-200 overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between shadow-2xl z-30">
        <div className="flex items-center gap-4">
          <button onClick={onExit} className="p-2 text-slate-500 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-4 w-px bg-slate-800"></div>
          <h2 className="text-white font-bold text-sm flex items-center gap-2 tracking-tight">
            ESTÚDIO DE ENSINO <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-black">LIVE FEED</span>
          </h2>
        </div>

        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-slate-800">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id as ToolId)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                  activeTool === tool.id 
                    ? `bg-slate-800 text-white shadow-lg` 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <tool.icon className={`w-3.5 h-3.5 ${activeTool === tool.id ? tool.color : ''}`} />
                <span className="hidden sm:inline uppercase tracking-tighter">{tool.name}</span>
              </button>
            ))}
          </nav>

          <button 
            onClick={() => setShowCamera(!showCamera)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
              showCamera ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{showCamera ? 'CÂMERA ATIVA' : 'LIGAR CÂMERA'}</span>
          </button>
        </div>

        <div className="flex gap-2">
           <button className="p-2 text-slate-600 hover:text-white"><Settings className="w-4 h-4" /></button>
        </div>
      </header>

      {/* Main Workspace - Split Screen */}
      <div className="flex-grow flex overflow-hidden">
        
        {/* Left Side: Local Video Feed */}
        {showCamera && (
          <div className="w-full lg:w-[45%] border-r border-slate-800 bg-black flex flex-col relative animate-in slide-in-from-left duration-500">
             <div className="absolute top-4 right-4 z-20">
                <button onClick={() => setShowCamera(false)} className="p-2 bg-black/60 hover:bg-black rounded-full text-white/60 hover:text-white backdrop-blur-md transition-all">
                   <Minimize2 className="w-4 h-4" />
                </button>
             </div>
             <CameraStream />
          </div>
        )}

        {/* Right Side: Interactive Tools */}
        <div className={`flex-grow flex flex-col bg-black relative ${!showCamera ? 'w-full' : ''}`}>
           {!showCamera && (
             <button 
               onClick={() => setShowCamera(true)}
               className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg font-bold text-xs shadow-xl animate-bounce"
             >
               <Maximize2 className="w-4 h-4" /> REABRIR VÍDEO LOCAL
             </button>
           )}
           
           <div className="flex-grow overflow-hidden flex flex-col">
              {activeTool === 'manim_studio' && <ManimStudio isEmbedded={showCamera} />}
              {activeTool === 'lesson_planner' && <LessonPlanner />}
              {activeTool === 'probability_lab' && <ProbabilityLab />}
           </div>
        </div>
      </div>
    </div>
  );
};

export default OnlineClassroom;
