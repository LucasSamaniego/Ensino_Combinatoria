
import React, { useState, useEffect } from 'react';
import { StudyPlan, UserProgress, SkillState } from '../types';
import { generateStudyPath, calculateStudyEffort } from '../services/geminiService';
import { BASIC_MATH_TOPICS, COMBINATORICS_TOPICS, CONCURSOS_TOPICS } from '../constants';
import { Calendar, Clock, Target, Loader2, ArrowRight, GraduationCap, Gavel, Award, School, Check, Zap, AlertTriangle, Layers } from 'lucide-react';

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

  // AI Recommendation Data
  const [recommendedMinutes, setRecommendedMinutes] = useState(0);
  const [recommendationReason, setRecommendationReason] = useState('');
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Available Topics based on Category
  const availableTopics = category === 'math' 
    ? [...BASIC_MATH_TOPICS, ...COMBINATORICS_TOPICS] 
    : CONCURSOS_TOPICS;

  // Initial selection (Select All by default)
  useEffect(() => {
    if (availableTopics.length > 0 && selectedTopics.length === 0) {
      setSelectedTopics(availableTopics.map(t => t.name));
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

  const getFullGoalDescription = () => {
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
      selectedTopics
    );

    const newPlan: StudyPlan = {
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
      {/* Objective Type */}
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

      {/* Specific Goal */}
      {objectiveType && (
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

      {/* Deadline */}
      {specificGoal && (
        <div className="space-y-2 animate-in slide-in-from-top-4">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" /> Data da Prova / Meta
          </label>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
        </div>
      )}

      <button type="submit" disabled={!objectiveType || !specificGoal || !deadline} className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-300 mt-4 text-lg">
        Próximo: Selecionar Conteúdo <ArrowRight className="w-5 h-5" />
      </button>
    </form>
  );

  // 2. Topic Selection Step
  const renderTopicsStep = () => (
    <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
      <div className="text-center mb-4">
         <h3 className="text-xl font-bold text-slate-900">O que você precisa estudar?</h3>
         <p className="text-slate-500 text-sm">Selecione os tópicos do módulo de {category === 'math' ? 'Matemática' : 'Concursos'} que cairão na sua prova ou que são de seu interesse.</p>
      </div>

      <div className="flex justify-end mb-2">
         <button 
           type="button" 
           onClick={() => setSelectedTopics(selectedTopics.length === availableTopics.length ? [] : availableTopics.map(t => t.name))}
           className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
         >
           {selectedTopics.length === availableTopics.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-2 border border-slate-100 rounded-xl bg-slate-50">
        {availableTopics.map(topic => {
           const isSelected = selectedTopics.includes(topic.name);
           return (
             <button
               key={topic.id}
               onClick={() => toggleTopic(topic.name)}
               className={`p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
                 isSelected 
                   ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-200' 
                   : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
               }`}
             >
               <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                 {isSelected && <Check className="w-3 h-3 text-white" />}
               </div>
               <span className={`text-sm font-medium ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>
                 {topic.name}
               </span>
             </button>
           );
        })}
      </div>

      <div className="flex gap-4 pt-4">
        <button onClick={() => setStep('config')} className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">
           Voltar
        </button>
        <button 
           onClick={handleTopicsSubmit} 
           disabled={loadingAnalysis || selectedTopics.length === 0}
           className="flex-[2] bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
        >
          {loadingAnalysis ? <Loader2 className="animate-spin" /> : <>Analisar Disponibilidade <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );

  // 3. Strategy Step
  const renderStrategyStep = () => {
    const weeklyUser = Math.round((userDailyMinutes * 7) / 60);
    const weeklyRec = Math.round((recommendedMinutes * 7) / 60);
    
    return (
      <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
        <div className="text-center">
           <h3 className="text-2xl font-bold text-slate-900 mb-2">Selecione sua Estratégia</h3>
           <p className="text-slate-500 text-sm">Baseado nos {selectedTopics.length} tópicos selecionados e no prazo até {new Date(deadline).toLocaleDateString()}.</p>
        </div>

        {/* User Availability Slider (Now here for adjustment) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-slate-400" /> Ajuste sua Disponibilidade Diária:
            </label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min={15} 
                max={300} 
                step={15} 
                value={userDailyMinutes} 
                onChange={e => setUserDailyMinutes(parseInt(e.target.value))} 
                className="flex-grow accent-slate-900" 
              />
              <span className="bg-white border border-slate-200 text-slate-900 font-bold px-3 py-1 rounded-lg text-sm min-w-[4rem] text-center">
                {userDailyMinutes} min
              </span>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Opção Recomendada (IA) */}
          <button onClick={() => handleFinalize(recommendedMinutes)} className="group relative p-6 rounded-2xl border-2 border-indigo-500 bg-indigo-50 hover:bg-indigo-100 transition-all text-left flex flex-col h-full shadow-lg shadow-indigo-100 ring-2 ring-indigo-200 ring-offset-2">
             <div className="absolute -top-3 -right-3 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">RECOMENDADO</div>
             <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-indigo-200 text-indigo-700 rounded-xl flex items-center justify-center"><Zap className="w-6 h-6" /></div>
                <div><h4 className="font-bold text-indigo-900 text-lg">Ritmo Ideal</h4><span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Otimizado por IA</span></div>
             </div>
             <div className="space-y-3 mb-6 flex-grow">
               <div className="flex items-end gap-2"><span className="text-4xl font-black text-slate-900">{recommendedMinutes}</span><span className="text-sm font-bold text-slate-500 mb-1">min/dia</span></div>
               <div className="text-xs font-bold text-slate-400 bg-white/50 px-2 py-1 rounded w-fit">~{weeklyRec} horas por semana</div>
               <p className="text-sm text-slate-600 mt-4 leading-relaxed bg-white p-3 rounded-lg border border-indigo-100">{recommendationReason}</p>
             </div>
             <div className="mt-auto w-full py-2 text-center text-sm font-bold text-indigo-700 bg-white rounded-lg border border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white transition-colors">Seguir Recomendação</div>
          </button>

          {/* Opção do Usuário */}
          <button onClick={() => handleFinalize(userDailyMinutes)} className="group relative p-6 rounded-2xl border-2 border-slate-200 bg-white hover:border-slate-400 transition-all text-left flex flex-col h-full hover:shadow-lg">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center"><Clock className="w-6 h-6" /></div>
                <div><h4 className="font-bold text-slate-900 text-lg">Sua Preferência</h4><span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Definido por você</span></div>
             </div>
             <div className="space-y-3 mb-6 flex-grow">
               <div className="flex items-end gap-2"><span className="text-4xl font-black text-slate-900">{userDailyMinutes}</span><span className="text-sm font-bold text-slate-500 mb-1">min/dia</span></div>
               <div className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded w-fit">~{weeklyUser} horas por semana</div>
               {userDailyMinutes < recommendedMinutes && <div className="flex gap-2 items-start mt-4 bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><p>Atenção: Tempo pode ser curto para cobrir todos os {selectedTopics.length} tópicos selecionados.</p></div>}
             </div>
             <div className="mt-auto w-full py-2 text-center text-sm font-bold text-slate-600 bg-slate-50 rounded-lg border border-slate-200 group-hover:bg-slate-800 group-hover:text-white transition-colors">Seguir Meu Tempo</div>
          </button>
        </div>
        
        <button onClick={() => setStep('topics')} className="mx-auto block text-sm text-slate-400 hover:text-slate-600 underline">Voltar para Tópicos</button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl mb-4 shadow-sm"><Target className="w-8 h-8" /></div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{step === 'generating' ? 'Criando sua Rota...' : 'Configure sua Bússola'}</h2>
          {step === 'generating' ? (
             <div className="flex flex-col items-center mt-6"><Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" /><p className="text-slate-500">A IA está estruturando suas semanas de estudo.</p></div>
          ) : (
            <p className="text-slate-500 mt-2 max-w-lg mx-auto">Vamos criar um plano adaptativo considerando seu nível atual e os tópicos que você deseja dominar.</p>
          )}
        </div>

        {step === 'config' && renderConfigStep()}
        {step === 'topics' && renderTopicsStep()}
        {step === 'strategy' && renderStrategyStep()}
      </div>
    </div>
  );
};

export default StudyPlanSetup;
