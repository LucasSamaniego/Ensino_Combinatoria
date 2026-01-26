import React, { useState, useEffect } from 'react';
import { StudyPlan, UserProgress, SkillState } from '../types';
import { generateStudyPath, calculateStudyEffort } from '../services/geminiService';
import { BASIC_MATH_TOPICS, COMBINATORICS_TOPICS, CONCURSOS_TOPICS } from '../constants';
import { Calendar, Clock, Target, Loader2, ArrowRight, GraduationCap, Gavel, Award, School, Check, Zap, AlertTriangle, Layers, Building2 } from 'lucide-react';

interface StudyPlanSetupProps {
  progress: UserProgress;
  onPlanCreated: (plan: StudyPlan) => void;
  category: 'math' | 'concursos';
}

type ObjectiveType = 'school' | 'contest' | 'deep_dive' | null;

const StudyPlanSetup: React.FC<StudyPlanSetupProps> = ({ progress, onPlanCreated, category }) => {
  // Steps: Config -> Topics -> Strategy -> Generating
  const [step, setStep] = useState<'config' | 'topics' | 'strategy' | 'generating'>('config');

  // Form Data
  const [objectiveType, setObjectiveType] = useState<ObjectiveType>(null);
  const [specificGoal, setSpecificGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [userDailyMinutes, setUserDailyMinutes] = useState(60);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  
  // Concursos Specific Data
  const [selectedBoards, setSelectedBoards] = useState<string[]>([]);

  // AI Recommendation Data
  const [recommendedMinutes, setRecommendedMinutes] = useState(0);
  const [recommendationReason, setRecommendationReason] = useState('');
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Available Topics based on Category
  const availableTopics = category === 'math' 
    ? [...BASIC_MATH_TOPICS, ...COMBINATORICS_TOPICS] 
    : CONCURSOS_TOPICS;

  // Initial setup based on category
  useEffect(() => {
    // Topics selection default (Select All)
    if (availableTopics.length > 0 && selectedTopics.length === 0) {
      setSelectedTopics(availableTopics.map(t => t.name));
    }

    // Category specific Logic
    if (category === 'concursos') {
      setObjectiveType('contest'); // Auto-set contest for concursos module
    } else {
      setObjectiveType(null); // Reset for math
    }
  }, [category]);

  const schoolOptions = [
    "6º Ano (Fundamental II)", "7º Ano (Fundamental II)", "8º Ano (Fundamental II)", "9º Ano (Fundamental II)",
    "1º Ano (Ensino Médio)", "2º Ano (Ensino Médio)", "3º Ano (Ensino Médio)"
  ];

  const contestOptions = [
    "ENEM & Vestibulares", "ESA / ESPCEX (Carreira Militar)", "AFA / ITA / IME (Alta Performance)",
    "Carreiras Policiais (PF/PRF)", "Tribunais e Administrativo", "Concurso Nacional Unificado (CNU)"
  ];

  const deepDiveOptions = [
    "Olimpíadas (OBMEP/OBM)", "Matemática Universitária (Cálculo/Álgebra)", "Curiosidade Pura & Hobby"
  ];

  const examBoards = [
    "FGV", "CEBRASPE (CESPE)", "FCC", "VUNESP", "CESGRANRIO", "IDECAN", "IBFC", "AOCP", "QUADRIX"
  ];

  const toggleBoard = (board: string) => {
    if (selectedBoards.includes(board)) {
      setSelectedBoards(selectedBoards.filter(b => b !== board));
    } else {
      setSelectedBoards([...selectedBoards, board]);
    }
  };

  const getFullGoalDescription = () => {
    if (category === 'concursos') {
      const boardsStr = selectedBoards.length > 0 ? selectedBoards.join(', ') : 'Todas as Principais';
      return `Aprovação em Concurso Público. Foco total no estilo e jurisprudência das seguintes BANCAS: ${boardsStr}.`;
    }

    if (objectiveType === 'school') {
      return `Reforço Escolar para o ${specificGoal} (Foco na BNCC e recuperação de notas)`;
    } else if (objectiveType === 'contest') {
      return `Aprovação no Concurso: ${specificGoal} (Foco estrito no Edital e resolução de questões)`;
    } else {
      return `Aprofundamento Acadêmico em ${specificGoal} (Foco em rigor matemático e demonstrações)`;
    }
  };

  const getWeaknesses = () => {
    return Object.values(progress.skills)
      .filter((s: SkillState) => s.masteryProbability < 0.45)
      .map((s: SkillState) => s.name);
  };

  const toggleTopic = (topicName: string) => {
    if (selectedTopics.includes(topicName)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topicName));
    } else {
      setSelectedTopics([...selectedTopics, topicName]);
    }
  };

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('topics');
  };

  const handleTopicsSubmit = async () => {
    if (selectedTopics.length === 0) {
      alert("Selecione pelo menos um tópico.");
      return;
    }

    setLoadingAnalysis(true);
    // Move to strategy step, triggering analysis
    const effort = await calculateStudyEffort(
      getWeaknesses(),
      getFullGoalDescription(),
      deadline,
      selectedTopics
    );

    setRecommendedMinutes(effort.recommendedMinutes);
    setRecommendationReason(effort.reasoning);
    setLoadingAnalysis(false);
    setStep('strategy');
  };

  const handleFinalize = async (chosenMinutes: number) => {
    setStep('generating');

    const schedule = await generateStudyPath(
      getWeaknesses(), 
      getFullGoalDescription(), 
      deadline, 
      chosenMinutes,
      selectedTopics,
      category // Pass category to enforce strict module boundaries
    );

    const newPlan: StudyPlan = {
      category: category, // Save category
      goal: getFullGoalDescription(),
      deadline,
      dailyMinutes: chosenMinutes,
      generatedSchedule: schedule,
      createdAt: Date.now()
    };

    onPlanCreated(newPlan);
  };

  // 1. Goal Configuration Step
  const renderConfigStep = () => (
    <form onSubmit={handleConfigSubmit} className="space-y-8 animate-in fade-in">
      
      {/* MATH MODULE: Objective Type Selection */}
      {category === 'math' && (
        <div className="space-y-4">
          <label className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs">1</span>
            Qual seu foco principal?
          </label>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button type="button" onClick={() => { setObjectiveType('school'); setSpecificGoal(''); }} className={`p-4 rounded-xl border-2 text-left transition-all ${objectiveType === 'school' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${objectiveType === 'school' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}><School className="w-6 h-6" /></div>
              <h3 className="font-bold text-slate-800">Escola</h3>
              <p className="text-xs text-slate-500 mt-1">Reforço, provas e currículo escolar (BNCC).</p>
            </button>

            <button type="button" onClick={() => { setObjectiveType('contest'); setSpecificGoal(''); }} className={`p-4 rounded-xl border-2 text-left transition-all ${objectiveType === 'contest' ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${objectiveType === 'contest' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}><Gavel className="w-6 h-6" /></div>
              <h3 className="font-bold text-slate-800">Concursos</h3>
              <p className="text-xs text-slate-500 mt-1">Militares, Vestibulares, Públicos e Enem.</p>
            </button>

            <button type="button" onClick={() => { setObjectiveType('deep_dive'); setSpecificGoal(''); }} className={`p-4 rounded-xl border-2 text-left transition-all ${objectiveType === 'deep_dive' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${objectiveType === 'deep_dive' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}><Award className="w-6 h-6" /></div>
              <h3 className="font-bold text-slate-800">Olímpico</h3>
              <p className="text-xs text-slate-500 mt-1">OBMEP, Graduação e Matemática pura.</p>
            </button>
          </div>
        </div>
      )}

      {/* MATH MODULE: Specific Goal Dropdown */}
      {category === 'math' && objectiveType && (
        <div className="space-y-4 animate-in slide-in-from-top-4">
          <label className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs">2</span>
            Selecione o alvo específico:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(objectiveType === 'school' ? schoolOptions : objectiveType === 'contest' ? contestOptions : deepDiveOptions).map((opt) => (
              <button key={opt} type="button" onClick={() => setSpecificGoal(opt)} className={`px-4 py-3 rounded-lg text-sm font-medium border transition-all text-left flex items-center justify-between ${specificGoal === opt ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-[1.02]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                {opt}
                {specificGoal === opt && <Check className="w-4 h-4 text-emerald-400" />}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Ou digite outro objetivo específico..." value={specificGoal} onChange={(e) => setSpecificGoal(e.target.value)} className="w-full mt-2 bg-transparent border-b border-slate-300 py-2 text-sm focus:border-indigo-500 outline-none placeholder:text-slate-400" />
        </div>
      )}

      {/* CONCURSOS MODULE: Board Selection (Replaces Specific Goal) */}
      {category === 'concursos' && (
        <div className="space-y-4 animate-in slide-in-from-top-4">
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-6">
             <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                <Gavel className="w-5 h-5" /> Configuração de Concurso Público
             </h3>
             <p className="text-xs text-indigo-700 mt-1">
               Neste módulo, não perguntamos seu foco principal pois ele é, por definição, aprovação em cargos públicos.
             </p>
          </div>

          <label className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs">1</span>
            Selecione as Bancas Prioritárias:
          </label>
          <p className="text-xs text-slate-500 -mt-2">O algoritmo irá priorizar questões e estilos destas organizadoras.</p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {examBoards.map((board) => {
              const isSelected = selectedBoards.includes(board);
              return (
                <button 
                  key={board} 
                  type="button" 
                  onClick={() => toggleBoard(board)} 
                  className={`px-4 py-3 rounded-lg text-sm font-medium border transition-all text-left flex items-center justify-between ${
                    isSelected 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-[1.02]' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-2"><Building2 className="w-4 h-4 opacity-70"/> {board}</span>
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </button>
              );
            })}
          </div>
          {selectedBoards.length === 0 && (
             <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
               <AlertTriangle className="w-3 h-3" /> Se nenhuma for selecionada, o modo será "Geral/Multibanca".
             </p>
          )}
        </div>
      )}

      {/* Deadline (Common for both) */}
      {(specificGoal || category === 'concursos') && (
        <div className="space-y-4 animate-in slide-in-from-top-4">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" /> Data da Prova / Meta
          </label>
          <input 
             type="date" 
             value={deadline} 
             onChange={e => setDeadline(e.target.value)} 
             className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
             min={new Date().toISOString().split('T')[0]}
             required
          />

          <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mt-4">
            <Clock className="w-4 h-4 text-slate-400" /> Tempo Disponível por Dia (Minutos)
          </label>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="15" 
              max="240" 
              step="15" 
              value={userDailyMinutes} 
              onChange={(e) => setUserDailyMinutes(parseInt(e.target.value))}
              className="flex-grow h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="font-mono font-bold text-indigo-600 w-16 text-right">{userDailyMinutes} min</span>
          </div>
        </div>
      )}

      <div className="pt-4 flex justify-end">
        <button 
          type="submit" 
          disabled={!deadline || (!specificGoal && category === 'math')}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg"
        >
          Próximo <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );

  const renderTopicsStep = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-500" /> Seleção de Tópicos
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          Personalize seu escopo. O algoritmo vai distribuir apenas o que estiver marcado.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          {availableTopics.map(topic => {
            const isSelected = selectedTopics.includes(topic.name);
            return (
              <div 
                key={topic.id}
                onClick={() => toggleTopic(topic.name)}
                className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
              >
                <span className={`text-sm font-medium ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>{topic.name}</span>
                <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={() => setStep('config')} className="text-slate-500 hover:text-slate-800 font-bold px-4">Voltar</button>
        <button 
          onClick={handleTopicsSubmit}
          disabled={selectedTopics.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2 shadow-lg"
        >
          {loadingAnalysis ? <Loader2 className="animate-spin w-5 h-5" /> : <>Analisar & Gerar <Zap className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );

  const renderStrategyStep = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-2xl text-white shadow-xl">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-white/10 rounded-xl">
            <Target className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Estratégia Recomendada</h3>
            <p className="text-indigo-200 text-sm mt-1">{recommendationReason}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mt-8 border-t border-white/10 pt-8">
           <div>
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">Seu Tempo</div>
              <div className="text-3xl font-black">{userDailyMinutes} <span className="text-sm font-medium text-slate-400">min/dia</span></div>
           </div>
           <div>
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-widest mb-1">Ideal (IA)</div>
              <div className="text-3xl font-black text-emerald-400">{recommendedMinutes} <span className="text-sm font-medium text-emerald-200/60">min/dia</span></div>
           </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
         <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
         <div className="text-sm text-amber-800">
           <span className="font-bold">Nota Pedagógica:</span> Se o tempo ideal for muito maior que o seu disponível, o plano focará nos tópicos de maior peso ou reduzirá a profundidade.
         </div>
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={() => setStep('topics')} className="text-slate-500 hover:text-slate-800 font-bold px-4">Voltar</button>
        <button 
          onClick={() => handleFinalize(userDailyMinutes)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-emerald-200/50 transition-all transform hover:-translate-y-1"
        >
          Confirmar e Gerar Plano <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderGeneratingStep = () => (
    <div className="py-20 flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
      <div className="relative mb-8">
        <div className="w-24 h-24 border-4 border-indigo-100 rounded-full animate-ping absolute top-0 left-0"></div>
        <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl relative z-10">
           <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-2">Construindo sua Jornada</h3>
      <p className="text-slate-500 max-w-sm mx-auto">
        A Inteligência Artificial está analisando {selectedTopics.length} tópicos, suas lacunas de aprendizado e o prazo disponível para criar a rota otimizada.
      </p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-100 my-8">
      {step !== 'generating' && (
        <div className="mb-10">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl font-black text-slate-900">{category === 'math' ? 'Plano de Estudos Personalizado' : 'Planejamento de Edital'}</h2>
             <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-wider">
               Fase {step === 'config' ? '1' : step === 'topics' ? '2' : '3'} de 3
             </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
             <div 
               className="bg-indigo-600 h-full transition-all duration-500 ease-out" 
               style={{ width: step === 'config' ? '33%' : step === 'topics' ? '66%' : '100%' }}
             ></div>
          </div>
        </div>
      )}

      {step === 'config' && renderConfigStep()}
      {step === 'topics' && renderTopicsStep()}
      {step === 'strategy' && renderStrategyStep()}
      {step === 'generating' && renderGeneratingStep()}
    </div>
  );
};

export default StudyPlanSetup;