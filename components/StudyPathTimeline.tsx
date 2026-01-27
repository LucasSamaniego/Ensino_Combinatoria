
import React, { useState } from 'react';
import { StudyPlan, StudyWeek, SkillState } from '../types';
import { TOPICS_DATA } from '../constants';
import { Calendar, CheckCircle2, Circle, Clock, MapPin, Flag, Play, ChevronDown, ChevronUp, Lock, Download, FileDown, Hourglass, ArrowRight, BookOpen, Video, Lightbulb, Link } from 'lucide-react';

// Declare html2pdf on window
declare global {
  interface Window {
    html2pdf: any;
  }
}

interface StudyPathTimelineProps {
  plan: StudyPlan;
  skills: { [key: string]: SkillState };
  onStartWeek: (topics: string[], theme: string) => void;
}

const StudyPathTimeline: React.FC<StudyPathTimelineProps> = ({ plan, skills, onStartWeek }) => {
  // Simulação de lógica temporal: calcula a semana atual baseada na data de criação
  const daysPassed = Math.floor((Date.now() - plan.createdAt) / (1000 * 60 * 60 * 24));
  const currentWeekIndex = Math.min(Math.floor(daysPassed / 7), plan.generatedSchedule.length - 1);
  
  // Estado para expandir semanas futuras
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Alteração: Não bloqueia mais semanas futuras
  const getWeekStatus = (index: number) => {
    if (index < currentWeekIndex) return 'completed';
    if (index === currentWeekIndex) return 'active';
    return 'upcoming'; // Substitui 'locked' por 'upcoming'
  };

  const calculateProgress = () => {
    const totalWeeks = plan.generatedSchedule.length;
    return Math.round(((currentWeekIndex) / totalWeeks) * 100);
  };

  const translateFocusArea = (area: string) => {
    switch (area) {
      case 'Fixation': return 'Fixação';
      case 'Practice': return 'Prática';
      case 'Revision': return 'Revisão';
      case 'Advanced': return 'Aprofundamento';
      default: return area;
    }
  };

  const handleDownloadPDF = () => {
    setIsDownloading(true);
    // Target the specific "Document View" container instead of the timeline
    const element = document.getElementById('study-plan-document-view');
    
    if (element && window.html2pdf) {
      const opt = {
        margin:       [10, 10, 10, 10],
        filename:     `Plano_Estudos_${plan.category}_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // Temporarily reveal the document view
      element.classList.remove('hidden');
      
      window.html2pdf().set(opt).from(element).save().then(() => {
        // Hide it again
        element.classList.add('hidden');
        setIsDownloading(false);
      });
    } else {
      setIsDownloading(false);
      alert("Erro ao gerar PDF. Tente novamente.");
    }
  };

  // Helper to format studied hours
  const formatStudiedTime = (minutes: number | undefined) => {
    if (!minutes) return "0h 0m";
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h}h ${m}m`;
  };

  // Helper to get proficiency for a topic name
  const getTopicProficiency = (topicName: string): number => {
    // 1. Try exact match by name in TOPICS_DATA
    let foundTopic = TOPICS_DATA.find(t => t.name === topicName);
    
    // 2. Try partial match if not found (AI might slightly alter the name)
    if (!foundTopic) {
      foundTopic = TOPICS_DATA.find(t => topicName.includes(t.name) || t.name.includes(topicName));
    }

    if (foundTopic && skills[foundTopic.id]) {
      return Math.round(skills[foundTopic.id].masteryProbability * 100);
    }
    
    // Default or unknown topic
    return 0;
  };

  const getProficiencyColor = (score: number) => {
    if (score >= 85) return 'bg-green-100 text-green-700 border-green-200';
    if (score >= 60) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-slate-100 text-slate-500 border-slate-200';
  };

  return (
    <div className="relative">
      
      {/* --- HIDDEN DOCUMENT VIEW FOR PDF GENERATION --- */}
      <div id="study-plan-document-view" className="hidden bg-white p-8 max-w-4xl mx-auto">
         <div className="mb-8 border-b-4 border-indigo-600 pb-4">
            <h1 className="text-3xl font-black text-slate-900 mb-2">{plan.title}</h1>
            <p className="text-lg text-slate-600 mb-2">{plan.goal}</p>
            <div className="flex gap-6 text-sm font-bold text-slate-500 uppercase tracking-widest">
               <span>Prazo: {new Date(plan.deadline).toLocaleDateString('pt-BR')}</span>
               <span>Meta Diária: {plan.dailyMinutes} min</span>
            </div>
         </div>

         <div className="space-y-8">
            {plan.generatedSchedule.map((week, idx) => (
               <div key={idx} className="bg-slate-50 p-6 rounded-xl border border-slate-200 break-inside-avoid">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                     <h3 className="text-xl font-bold text-indigo-800">Semana {week.weekNumber}: {week.theme}</h3>
                     <span className="text-xs font-bold bg-white px-2 py-1 border rounded uppercase text-slate-500">{translateFocusArea(week.focusArea)}</span>
                  </div>
                  
                  {/* Topics List */}
                  <div className="mb-4">
                     <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Tópicos Principais</h4>
                     <div className="flex flex-wrap gap-2">
                        {week.topicsToStudy.map(t => (
                           <span key={t} className="bg-white border px-2 py-1 rounded text-sm text-slate-700">{t}</span>
                        ))}
                     </div>
                  </div>

                  {/* Rich Content: Methodology */}
                  {week.description && (
                     <div className="mb-4">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-700 mb-1">
                           <Flag className="w-4 h-4" /> Metodologia Sugerida
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed">{week.description}</p>
                     </div>
                  )}

                  {/* Rich Content: Resources */}
                  <div className="grid grid-cols-2 gap-6">
                     {week.readingResources && week.readingResources.length > 0 && (
                        <div>
                           <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-700 mb-2">
                              <BookOpen className="w-4 h-4" /> Leitura & Fontes
                           </h4>
                           <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                              {week.readingResources.map((res, i) => (
                                 <li key={i}>{res}</li>
                              ))}
                           </ul>
                        </div>
                     )}

                     {week.videoSuggestions && week.videoSuggestions.length > 0 && (
                        <div>
                           <h4 className="flex items-center gap-2 text-sm font-bold text-red-700 mb-2">
                              <Video className="w-4 h-4" /> Vídeo-Aulas (Busca)
                           </h4>
                           <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                              {week.videoSuggestions.map((vid, i) => (
                                 <li key={i}>{vid}</li>
                              ))}
                           </ul>
                        </div>
                     )}
                  </div>

                  {/* Practical Tips */}
                  {week.practicalTips && (
                     <div className="mt-4 bg-amber-50 p-3 rounded-lg border border-amber-100 text-sm text-amber-800 flex gap-3 items-start">
                        <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                           <span className="font-bold block text-xs uppercase mb-1">Dica de Ouro</span>
                           {week.practicalTips}
                        </div>
                     </div>
                  )}
               </div>
            ))}
         </div>
         
         <div className="mt-8 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
            Plano gerado pela Plataforma de Estudos Adaptativa com IA.
         </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-indigo-100 overflow-hidden mb-10 animate-in slide-in-from-top-4 duration-700 relative">
        
        {/* Botão de Download Flutuante */}
        <div className="absolute top-6 right-6 z-20 hidden md:block">
          <button 
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/40 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
          >
            {isDownloading ? 'Gerando...' : <><FileDown className="w-4 h-4" /> Baixar Plano Completo</>}
          </button>
        </div>

        <div id="study-plan-timeline-view">
          {/* Header do Plano */}
          <div className="bg-slate-900 p-6 md:p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-3xl opacity-20 -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-2">
                  <MapPin className="w-4 h-4" /> Plano de Navegação
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
                  {plan.title}
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
                const isExpanded = expandedWeek === idx || status === 'active';
                
                // Calculate weekly study progress
                const studied = week.studiedMinutes || 0;
                const targetWeekly = plan.dailyMinutes * 5; // Assuming 5 study days per week
                const percentStudied = Math.min(100, Math.round((studied / targetWeekly) * 100));

                return (
                  <div 
                    key={idx} 
                    className={`relative z-10 transition-all duration-300 ${status === 'active' ? 'transform scale-[1.02]' : ''}`}
                  >
                    {/* Marcador da Linha do Tempo */}
                    <div className={`absolute left-0 top-6 w-14 flex justify-center`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 z-10 ${
                        status === 'completed' ? 'bg-green-500 border-green-100 text-white' :
                        status === 'active' ? 'bg-indigo-600 border-indigo-100 text-white shadow-lg shadow-indigo-200' :
                        'bg-white border-slate-200 text-slate-400'
                      }`}>
                        {status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> :
                        status === 'active' ? <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> :
                        <Circle className="w-3 h-3" />
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
                        <div className="flex-grow">
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
                              {translateFocusArea(week.focusArea)}
                            </span>
                          </div>
                          <h4 className={`font-bold ${status === 'active' ? 'text-indigo-900 text-lg' : 'text-slate-700'}`}>
                            {week.theme}
                          </h4>
                          
                          {/* Weekly Time Tracker */}
                          {(status === 'active' || status === 'completed') && week.studiedMinutes ? (
                            <div className="mt-3 flex items-center gap-3">
                               <div className="flex-grow max-w-[200px] h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${percentStudied}%` }}></div>
                               </div>
                               <div className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                 <Hourglass className="w-3 h-3" />
                                 {formatStudiedTime(week.studiedMinutes)}
                               </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="text-slate-400 html2pdf__ignore ml-4">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>

                      {/* Detalhes (Expandido) */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-2 border-t border-slate-100/50 animate-in slide-in-from-top-2">
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">Tópicos Prioritários & Proficiência</p>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
                            {week.topicsToStudy.map((topic, i) => {
                              const mastery = getTopicProficiency(topic);
                              return (
                                <li key={i} className="flex items-center justify-between text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status === 'active' ? 'bg-indigo-500' : 'bg-slate-400'}`}></div>
                                    <span>{topic}</span>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getProficiencyColor(mastery)}`}>
                                    {mastery}%
                                  </span>
                                </li>
                              );
                            })}
                          </ul>

                          {/* Extra Details Preview (Available for Download) */}
                          {week.description && (
                             <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase mb-1">
                                   <Flag className="w-3 h-3" /> Estratégia da Semana
                                </div>
                                <p className="text-sm text-slate-600">{week.description}</p>
                             </div>
                          )}

                          {(week.readingResources || week.videoSuggestions) && (
                             <div className="grid grid-cols-2 gap-4 mb-4">
                                {week.readingResources && (
                                   <div className="text-xs text-slate-500">
                                      <strong className="block text-emerald-600 mb-1 flex items-center gap-1"><BookOpen className="w-3 h-3"/> Leitura</strong>
                                      {week.readingResources[0]}...
                                   </div>
                                )}
                                {week.videoSuggestions && (
                                   <div className="text-xs text-slate-500">
                                      <strong className="block text-red-600 mb-1 flex items-center gap-1"><Video className="w-3 h-3"/> Vídeo</strong>
                                      {week.videoSuggestions[0]}...
                                   </div>
                                )}
                             </div>
                          )}

                          {/* Alteração: Botão de estudo disponível para TODAS as semanas */}
                          <div className="mt-4 pt-4 border-t border-slate-100 html2pdf__ignore">
                            <button 
                              onClick={(e) => { e.stopPropagation(); onStartWeek(week.topicsToStudy, week.theme); }}
                              className={`w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg ${
                                status === 'active' 
                                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200' 
                                  : 'bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50'
                              }`}
                            >
                              <Play className={`w-4 h-4 ${status === 'active' ? 'fill-white' : 'fill-indigo-600'}`} />
                              {status === 'completed' ? 'Revisar Conteúdo da Semana' : 'Acessar Material da Semana'}
                            </button>
                          </div>
                          
                          {/* Summary of study time for completed weeks */}
                          {status === 'completed' && (
                             <div className="mt-4 pt-2 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                Semana concluída com {formatStudiedTime(week.studiedMinutes)} de estudo.
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
    </div>
  );
};

export default StudyPathTimeline;
