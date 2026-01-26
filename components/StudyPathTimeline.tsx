
import React, { useState } from 'react';
import { StudyPlan, StudyWeek } from '../types';
import { Calendar, CheckCircle2, Circle, Clock, MapPin, Flag, Play, ChevronDown, ChevronUp, Lock, Download, FileDown } from 'lucide-react';

// Declare html2pdf on window
declare global {
  interface Window {
    html2pdf: any;
  }
}

interface StudyPathTimelineProps {
  plan: StudyPlan;
  onStartWeek: (topics: string[], theme: string) => void;
}

const StudyPathTimeline: React.FC<StudyPathTimelineProps> = ({ plan, onStartWeek }) => {
  // Simulação de lógica temporal: calcula a semana atual baseada na data de criação
  const daysPassed = Math.floor((Date.now() - plan.createdAt) / (1000 * 60 * 60 * 24));
  const currentWeekIndex = Math.min(Math.floor(daysPassed / 7), plan.generatedSchedule.length - 1);
  
  // Estado para expandir semanas futuras
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const getWeekStatus = (index: number) => {
    if (index < currentWeekIndex) return 'completed';
    if (index === currentWeekIndex) return 'active';
    return 'locked';
  };

  const calculateProgress = () => {
    const totalWeeks = plan.generatedSchedule.length;
    return Math.round(((currentWeekIndex) / totalWeeks) * 100);
  };

  const handleDownloadPDF = () => {
    setIsDownloading(true);
    const element = document.getElementById('study-plan-content');
    
    if (element && window.html2pdf) {
      const opt = {
        margin:       [10, 10, 10, 10],
        filename:     `Plano_Estudos_${plan.category}_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      window.html2pdf().set(opt).from(element).save().then(() => {
        setIsDownloading(false);
      });
    } else {
      setIsDownloading(false);
      alert("Erro ao gerar PDF. Tente novamente.");
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-indigo-100 overflow-hidden mb-10 animate-in slide-in-from-top-4 duration-700 relative">
      
      {/* Botão de Download Flutuante */}
      <div className="absolute top-6 right-6 z-20 hidden md:block">
        <button 
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/40 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
        >
          {isDownloading ? 'Gerando...' : <><FileDown className="w-4 h-4" /> Baixar PDF</>}
        </button>
      </div>

      <div id="study-plan-content">
        {/* Header do Plano */}
        <div className="bg-slate-900 p-6 md:p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-3xl opacity-20 -mr-16 -mt-16 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-2">
                <MapPin className="w-4 h-4" /> Plano de Navegação
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
                {plan.goal}
              </h2>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1.5"><Flag className="w-4 h-4 text-red-400" /> Meta: {new Date(plan.deadline).toLocaleDateString()}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-400" /> {plan.dailyMinutes} min/dia</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 min-w-[150px] html2pdf__ignore">
              <span className="text-xs font-bold text-indigo-200 uppercase">Progresso</span>
              <div className="flex items-end gap-1 mt-1">
                  <span className="text-3xl font-black text-white">{calculateProgress()}%</span>
                  <span className="text-xs text-slate-400 mb-1">da jornada</span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${calculateProgress()}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Corpo da Jornada */}
        <div className="p-6 md:p-8 bg-slate-50">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-indigo-600 text-white w-6 h-6 rounded flex items-center justify-center text-xs">
                {plan.generatedSchedule.length}
              </span>
              Semanas de Preparação
            </h3>
            {/* Mobile Download Button */}
            <button 
              onClick={handleDownloadPDF}
              className="md:hidden text-indigo-600 p-2"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>

          <div className="relative space-y-4 before:absolute before:left-[27px] before:top-4 before:h-[calc(100%-24px)] before:w-0.5 before:bg-slate-200 before:z-0">
            {plan.generatedSchedule.map((week, idx) => {
              const status = getWeekStatus(idx);
              // For PDF export, we want to expand all relevant items or keep compact. 
              // Usually compact is better for PDF, but detailed is better for studying.
              // We'll rely on user interaction for web, but for PDF we just capture what's visible.
              const isExpanded = expandedWeek === idx || status === 'active';

              return (
                <div 
                  key={idx} 
                  className={`relative z-10 transition-all duration-300 ${status === 'active' ? 'transform scale-[1.02]' : 'opacity-80 hover:opacity-100'}`}
                >
                  {/* Marcador da Linha do Tempo */}
                  <div className={`absolute left-0 top-6 w-14 flex justify-center`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 z-10 ${
                      status === 'completed' ? 'bg-green-500 border-green-100 text-white' :
                      status === 'active' ? 'bg-indigo-600 border-indigo-100 text-white shadow-lg shadow-indigo-200' :
                      'bg-white border-slate-200 text-slate-300'
                    }`}>
                      {status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> :
                      status === 'active' ? <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> :
                      <Lock className="w-3 h-3" />
                      }
                    </div>
                  </div>

                  {/* Card da Semana */}
                  <div 
                    onClick={() => setExpandedWeek(expandedWeek === idx ? null : idx)}
                    className={`ml-14 rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                      status === 'active' 
                        ? 'bg-white border-indigo-500 shadow-xl ring-4 ring-indigo-50' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-5 flex items-center justify-between ${status === 'active' ? 'bg-indigo-50/50' : ''}`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            status === 'active' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            Semana {week.weekNumber}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                            week.focusArea === 'Fixation' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                            week.focusArea === 'Practice' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {week.focusArea === 'Fixation' ? 'Correção de Base' : 
                              week.focusArea === 'Practice' ? 'Prática Intensiva' : 
                              week.focusArea === 'Advanced' ? 'Aprofundamento' : 'Revisão'}
                          </span>
                        </div>
                        <h4 className={`font-bold ${status === 'active' ? 'text-indigo-900 text-lg' : 'text-slate-700'}`}>
                          {week.theme}
                        </h4>
                      </div>

                      <div className="text-slate-400 html2pdf__ignore">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>

                    {/* Detalhes (Expandido) */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-slate-100/50 animate-in slide-in-from-top-2">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">Tópicos Prioritários</p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {week.topicsToStudy.map((topic, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status === 'active' ? 'bg-indigo-500' : 'bg-slate-400'}`}></div>
                              {topic}
                            </li>
                          ))}
                        </ul>

                        {status === 'active' && (
                          <div className="mt-4 pt-4 border-t border-slate-100 html2pdf__ignore">
                            <button 
                              onClick={(e) => { e.stopPropagation(); onStartWeek(week.topicsToStudy, week.theme); }}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200"
                            >
                              <Play className="w-4 h-4 fill-white" />
                              Começar Estudo da Semana
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyPathTimeline;
