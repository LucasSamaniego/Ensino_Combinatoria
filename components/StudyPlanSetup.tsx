
import React, { useState, useEffect, useRef } from 'react';
import { StudyPlan, UserProgress, SkillState } from '../types';
import { generateStudyPath, calculateStudyEffort, analyzeSyllabus } from '../services/geminiService';
import { BASIC_MATH_TOPICS, COMBINATORICS_TOPICS, CONCURSOS_TOPICS } from '../constants';
import { Calendar, Clock, Target, Loader2, ArrowRight, GraduationCap, Gavel, Award, School, Check, Zap, AlertTriangle, Layers, Building2, UploadCloud, FileText, PenTool } from 'lucide-react';

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
  const [planTitle, setPlanTitle] = useState('');
  const [objectiveType, setObjectiveType] = useState<ObjectiveType>(null);
  const [specificGoal, setSpecificGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [userDailyMinutes, setUserDailyMinutes] = useState(60);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  
  // Concursos Specific Data
  const [selectedBoards, setSelectedBoards] = useState<string[]>([]);
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [isAnalyzingSyllabus, setIsAnalyzingSyllabus] = useState(false);
  const [syllabusSummary, setSyllabusSummary] = useState<string>('');
  
  // AI Recommendation Data
  const [recommendedMinutes, setRecommendedMinutes] = useState(0);
  const [recommendationReason, setRecommendationReason] = useState('');
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available Topics based on Category
  const availableTopics = category === 'math' 
    ? [...BASIC_MATH_TOPICS, ...COMBINATORICS_TOPICS] 
    : CONCURSOS_TOPICS;

  // Initial setup based on category
  useEffect(() => {
    // Topics selection default (Select All initially, but wait if upload happens)
    if (availableTopics.length > 0 && selectedTopics.length === 0 && !syllabusFile) {
      setSelectedTopics(availableTopics.map(t => t.name));
    }

    // Category specific Logic
    if (category === 'concursos') {
      setObjectiveType('contest'); // Auto-set contest for concursos module
    } else {
      setObjectiveType(null); // Reset for math
    }
  }, [category, syllabusFile]);

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

  // --- SYLLABUS UPLOAD HANDLER ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSyllabusFile(file);
      
      // Auto-set title if empty
      if (!planTitle) {
        setPlanTitle(file.name.replace('.pdf', '').replace('.txt', ''));
      }

      // Automatic Analysis
      setIsAnalyzingSyllabus(true);
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          // Extract base64 part (remove data:application/pdf;base64,)
          const base64Data = base64String.split(',')[1];
          
          const analysis = await analyzeSyllabus(base64Data, file.type);
          
          if (analysis.matchedTopics.length > 0) {
             setSelectedTopics(analysis.matchedTopics);
             setSyllabusSummary(analysis.summary);
          } else {
             setSyllabusSummary("Nenhum tópico padrão identificado, mas o contexto será usado.");
          }
          setIsAnalyzingSyllabus(false);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error(err);
        setIsAnalyzingSyllabus(false);
      }
    }
  };

  const getFullGoalDescription = () => {
    if (category === 'concursos') {
      const boardsStr = selectedBoards.length > 0 ? selectedBoards.join(', ') : 'Todas as Principais';
      return `Aprovação em Concurso Público. FILTRO DE BANCAS: [${boardsStr}]. Foco total no estilo e jurisprudência destas organizadoras.`;
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
    if (!planTitle) {
      alert("Por favor, dê um nome ao seu plano.");
      return;
    }
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
      category, // Pass category to enforce strict module boundaries
      syllabusSummary // Pass extracted syllabus context
    );

    const newPlan: StudyPlan = {
      id: crypto.randomUUID(), // New unique ID for the plan
      title: planTitle || 'Novo Plano',
      category: category, 
      goal: getFullGoalDescription(),
      deadline,
      dailyMinutes: chosenMinutes,
      generatedSchedule: schedule,
      createdAt: Date.now(),
      syllabusContext: syllabusSummary
    };

    onPlanCreated(newPlan);
  };

  // 1. Goal Configuration Step
  const renderConfigStep = () => (
    <form onSubmit={handleConfigSubmit} className="space-y-8 animate-in fade-in">
      
      {/* Plan Name Input */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
          Nome do Plano
        </label>
        <div className="relative">
          <PenTool className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            value={planTitle}
            onChange={(e) => setPlanTitle(e.target.value)}
            placeholder={category === 'math' ? "Ex: Recuperação Final, ENEM 2024" : "Ex: Edital PF 2024, TJ-SP Escrevente"}
            className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-medium"
            required
          />
        </div>
      </div>

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

      {/* CONCURSOS MODULE: Board Selection & Syllabus Upload */}
      {category === 'concursos' && (
        <div className="space-y-6 animate-in slide-in-from-top-4">
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
             <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                <Gavel className="w-5 h-5" /> Configuração de Concurso Público
             </h3>
             <p className="text-xs text-indigo-700 mt-1">
               Neste módulo, o foco é a aprovação baseada no Edital e Banca.
             </p>
          </div>

          {/* Syllabus Upload Section - The "Killer Feature" */}
          <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-6 bg-indigo-50/50 hover:bg-indigo-50 transition-colors text-center relative group">
             <input 
               type="file" 
               accept=".pdf,application/pdf,text/plain,image/*" 
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
               onChange={handleFileChange}
               ref={fileInputRef}
             />
             <div className="flex flex-col items-center justify-center gap-3">
               <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                 {isAnalyzingSyllabus ? <Loader2 className="w-6 h-6 animate-spin"/> : <UploadCloud className="w-6 h-6" />}
               </div>
               <div>
                 <h4 className="font-bold text-indigo-900">Análise Automática de Edital (IA)</h4>
                 <p className="text-xs text-indigo-600 mt-1 max-w-xs mx-auto">
                   Arraste o PDF do edital aqui ou clique para selecionar. A IA extrairá os tópicos e configurará seu plano.
                 </p>
               </div>
               {syllabusFile && !isAnalyzingSyllabus && (
                 <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-indigo-200 mt-2">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{syllabusFile.name}</span>
                    <Check className="w-4 h-4 text-emerald-500" />
                 </div>
               )}
             </div>
          </div>

          {syllabusSummary && (
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl animate-in fade-in">
               <h5 className="text-xs font-bold text-emerald-800 uppercase flex items-center gap-1 mb-1">
                 <Zap className="w-3 h-3" /> Resumo do Edital (IA)
               </h5>
               <p className="text-xs text-emerald-700">{syllabusSummary}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-3">
              Selecione as Bancas Prioritárias:
            </label>
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
          </div>
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
          disabled={!deadline || (!specificGoal && category === 'math') || isAnalyzingSyllabus}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg"
        >
          {isAnalyzingSyllabus ? 'Analisando...' : 'Próximo'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );

  const renderTopicsStep = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" /> Seleção de Tópicos
            </h3>
            <p className="text-sm text-slate-500">
              {syllabusFile ? "Tópicos pré-selecionados com base no Edital enviado." : "Personalize seu escopo manualmente."}
            </p>
          </div>
          {syllabusFile && (
             <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded border border-emerald-200 flex items-center gap-1">
               <Zap className="w-3 h-3" /> IA Ativada
             </span>
          )}
        </div>

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
