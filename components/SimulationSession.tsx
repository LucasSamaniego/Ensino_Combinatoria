
import React, { useState, useEffect } from 'react';
import { SimulationConfig, Question, Interaction, TopicId, SkillState, Difficulty } from '../types';
import { generateSimulationQuestions, generateProblem } from '../services/geminiService';
import { getDifficultyForMastery, updateHierarchicalKnowledge } from '../services/tracingService';
import { translateDifficulty } from '../constants';
import MathRenderer from './MathRenderer';
import Illustration from './Illustration';
import { Loader2, ArrowRight, CheckCircle, XCircle, Clock, Globe, Star, Lightbulb, BookOpen, Send, Building2, Target, TrendingUp, AlertCircle, BarChart2, Brain, Briefcase, Play, Hourglass } from 'lucide-react';

interface SimulationSessionProps {
  config: SimulationConfig;
  category?: 'math' | 'concursos' | 'portuguese';
  availableTopics: { id: TopicId; name: string }[];
  userSkills?: { [key: string]: SkillState };
  onComplete: (interactions: Interaction[]) => void;
  onCancel: () => void;
  onUpdateSkill?: (interaction: Interaction) => void; 
  onToggleFavorite?: (question: Question) => void;
  isFavorite?: (id: string) => boolean;
  studyGoalContext?: string;
  weeklyStudiedMinutes?: number; // New prop
}

type SessionPhase = 'intro' | 'active' | 'summary';

const SimulationSession: React.FC<SimulationSessionProps> = ({ 
  config, 
  category = 'math', 
  availableTopics, 
  userSkills, 
  onComplete, 
  onCancel,
  onUpdateSkill,
  onToggleFavorite,
  isFavorite,
  studyGoalContext,
  weeklyStudiedMinutes = 0
}) => {
  // Modes: 'test' (Classic Simulation) vs 'interactive' (Weekly Study)
  const mode = config.id === 'weekly_auto' ? 'interactive' : 'test';

  // UPDATED: Revert to 'intro' as default to show the new Dashboard before questions
  const [phase, setPhase] = useState<SessionPhase>('intro');
  const [initialSkills] = useState<{ [key: string]: SkillState }>(JSON.parse(JSON.stringify(userSkills || {})));
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [loadStatus, setLoadStatus] = useState<string>('');
  
  // Interactive Mode State
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0);
  const [questionsInTopic, setQuestionsInTopic] = useState(0);
  const QUESTIONS_PER_TOPIC_CYCLE = 3; 
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [localSkills, setLocalSkills] = useState<{ [key: string]: SkillState }>(userSkills || {});
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [showMiniTheory, setShowMiniTheory] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState(''); 

  // Timer
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Stats for Summary
  const [sessionStats, setSessionStats] = useState<{ [topicId: string]: { correct: number, total: number } }>({});

  // Initialize Local Skills for topics that might be new/custom (e.g. from Weekly Plan)
  // This ensures BKT update has a target to write to, and Summary shows progress.
  useEffect(() => {
    const missingSkills: { [key: string]: SkillState } = {};
    let hasMissing = false;

    availableTopics.forEach(t => {
      if (!localSkills[t.id]) {
        missingSkills[t.id] = {
          id: t.id,
          name: t.name,
          isParent: true,
          masteryProbability: 0.1, // Default start for new topics
          totalAttempts: 0,
          correctStreak: 0,
          averageResponseTime: 0
        };
        hasMissing = true;
      }
    });

    if (hasMissing) {
      setLocalSkills(prev => ({ ...prev, ...missingSkills }));
    }
  }, [availableTopics]);

  // Initialize for Classic Mode
  useEffect(() => {
    if (mode === 'test' && phase === 'active') {
      const initClassic = async () => {
        setLoading(true);
        const topicNames = availableTopics.map(t => t.name);
        setLoadStatus(`Gerando prova completa (${config.style})...`);
        try {
          const qs = await generateSimulationQuestions(config, topicNames);
          setQuestions(qs);
          setUserAnswers(new Array(qs.length).fill(''));
        } catch (e) {
          console.error(e);
        }
        setLoading(false);
      };
      initClassic();
    }
  }, [mode, phase]);

  // Pre-fetch first question for interactive mode if user hits start
  useEffect(() => {
    if (mode === 'interactive' && phase === 'active' && questions.length === 0 && !loading) {
      loadNextInteractiveQuestion(0);
    }
  }, [mode, phase]);

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (!loading && phase === 'active') {
      interval = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loading, phase]);

  // --- LOGIC: INTERACTIVE MODE ---

  const startInteractiveSession = async () => {
    setPhase('active');
  };

  const loadNextInteractiveQuestion = async (topicIdx: number) => {
    if (topicIdx >= availableTopics.length) {
      setPhase('summary');
      return;
    }

    setLoading(true);
    const topic = availableTopics[topicIdx];
    
    // Extract banks from context for better UX feedback
    const activeBank = studyGoalContext?.match(/FILTRO DE BANCAS: \[(.*?)\]/)?.[1] || "";
    const bankMsg = activeBank ? `(Banca: ${activeBank})` : "";
    
    setLoadStatus(`Pesquisando questão de ${topic.name} ${bankMsg}...`);
    
    const mastery = localSkills[topic.id]?.masteryProbability || 0.1;
    const adaptiveDifficulty = getDifficultyForMastery(mastery);

    try {
      // Usa generateProblem para buscar questão individualmente com o contexto correto
      const q = await generateProblem(
        category as 'math' | 'concursos' | 'portuguese',
        topic.name,
        topic.id,
        'adaptive_weekly',
        topic.name, // Passa o nome do tópico como subSkillName para guiar a busca
        adaptiveDifficulty,
        studyGoalContext // Contexto crucial (Edital/Bancas) para o Search
      );
      
      // CRITICAL FIX: Ensure the question has the correct topicId for BKT tracking
      const questionWithCorrectTopic = { ...q, topicId: topic.id };

      setQuestions(prev => [...prev, questionWithCorrectTopic]);
      setLoading(false);
      setFeedback(null);
      setCurrentAnswer('');
      setHintsRevealed(0);
      setShowMiniTheory(false);
    } catch (e) {
      console.error("Error generating question", e);
      setLoading(false);
    }
  };

  const handleInteractiveSubmit = () => {
    if (!currentAnswer) return;
    
    const currentQ = questions[currentIndex];
    
    // Robust comparison
    const normUser = currentAnswer.trim().toLowerCase();
    const normCorrect = currentQ.correctAnswer.trim().toLowerCase();
    const isCorrect = normUser === normCorrect || normUser.replace('.',',') === normCorrect.replace('.',',');
    
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    
    // Update Stats using the FORCED topic ID (to ensure it maps to the weekly plan)
    // We use availableTopics[currentTopicIdx].id because currentQ.topicId might be generic if AI failed
    const tId = availableTopics[currentTopicIdx]?.id || currentQ.topicId || 'unknown';
    
    setSessionStats(prev => ({
      ...prev,
      [tId]: {
        correct: (prev[tId]?.correct || 0) + (isCorrect ? 1 : 0),
        total: (prev[tId]?.total || 0) + 1
      }
    }));

    // Save Interaction
    const interaction: Interaction = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      topicId: tId as TopicId,
      subSkillId: 'weekly_cycle',
      isCorrect: isCorrect,
      timeSpentSeconds: 30, // Estimativa fixa para Interactive Mode para simplificar
      difficulty: currentQ.difficulty
    };

    // Update Local Skills (Visual Feedback)
    const updatedSkills = updateHierarchicalKnowledge(localSkills, interaction, { p_init: 0.1, p_transit: 0.2, p_slip: 0.1, p_guess: 0.2 });
    setLocalSkills(updatedSkills);

    // Trigger parent update (Persist to DB immediately)
    if (onUpdateSkill) onUpdateSkill(interaction);

    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = currentAnswer;
    setUserAnswers(newAnswers);
  };

  const handleInteractiveNext = () => {
    const nextQIdx = questionsInTopic + 1;
    let nextTopicIdx = currentTopicIdx;
    let resetTopicCount = false;

    if (nextQIdx >= QUESTIONS_PER_TOPIC_CYCLE) {
      nextTopicIdx++;
      resetTopicCount = true;
    } 
    
    if (resetTopicCount) {
      setQuestionsInTopic(0);
    } else {
      setQuestionsInTopic(nextQIdx);
    }

    setCurrentTopicIdx(nextTopicIdx);
    setCurrentIndex(prev => prev + 1);
    
    loadNextInteractiveQuestion(nextTopicIdx);
  };

  // --- LOGIC: CLASSIC MODE ---

  const handleSelectOptionClassic = (option: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = option;
    setUserAnswers(newAnswers);
  };

  const handleFinishClassic = () => {
    setPhase('summary');
  };

  const handleExit = () => {
     // Reconstruct interactions for final report if needed
     const interactions: Interaction[] = questions.map((q, idx) => {
      const uAns = userAnswers[idx] || "";
      const isCorrect = uAns.toLowerCase() === q.correctAnswer.toLowerCase();
      
      return {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        topicId: (q.topicId || 'intro_counting') as TopicId,
        subSkillId: 'simulation',
        isCorrect: isCorrect,
        timeSpentSeconds: timeElapsed / (questions.length || 1),
        difficulty: q.difficulty 
      };
    });
    onComplete(interactions);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatHrsMins = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = Math.floor(totalMinutes % 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  // --- RENDERERS ---

  if (loading && questions.length === currentIndex) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-800">{mode === 'interactive' ? 'Gerando Ciclo Adaptativo' : 'Criando Prova'}</h2>
        <p className="text-gray-500 mb-2 text-sm">{loadStatus}</p>
        {loadStatus.includes("Banca") && (
           <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded border border-amber-200 mt-2">
             FILTRO DE BANCA ATIVO
           </span>
        )}
      </div>
    );
  }

  // --- 1. INTRO PHASE ---
  if (phase === 'intro') {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-indigo-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
        {/* Header Hero */}
        <div className="bg-indigo-900 p-8 text-white relative overflow-hidden">
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
                   <Target className="w-8 h-8 text-indigo-400" />
                   {config.title}
                </h2>
                <p className="text-indigo-200 text-lg max-w-lg">{config.description}</p>
              </div>
              
              {/* Weekly Time Card */}
              {mode === 'interactive' && (
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl min-w-[160px] text-center">
                   <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1 flex items-center justify-center gap-2">
                     <Hourglass className="w-3 h-3" /> Tempo da Semana
                   </div>
                   <div className="text-3xl font-black text-white">{formatHrsMins(weeklyStudiedMinutes)}</div>
                </div>
              )}
           </div>
        </div>

        <div className="p-8">
           <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg">
             <BarChart2 className="w-5 h-5 text-indigo-600" />
             Habilidades e Proficiência Atual
           </h3>

           <div className="space-y-4 mb-8">
             {availableTopics.map(topic => {
               // Use localSkills here to reflect initialized values if missing
               const startMastery = localSkills[topic.id]?.masteryProbability || 0.1;
               const percent = Math.round(startMastery * 100);
               const difficulty = getDifficultyForMastery(startMastery);
               
               let barColor = 'bg-indigo-500';
               if (percent < 30) barColor = 'bg-red-500';
               else if (percent < 60) barColor = 'bg-yellow-500';
               else if (percent < 85) barColor = 'bg-green-500';
               else barColor = 'bg-purple-500';

               return (
                 <div key={topic.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-3">
                       <div>
                          <h4 className="font-bold text-slate-800 text-base">{topic.name}</h4>
                          <span className="text-xs text-slate-500 font-medium">Nível Detectado: <span className="uppercase">{translateDifficulty(difficulty)}</span></span>
                       </div>
                       <div className="text-right">
                          <span className="text-2xl font-black text-slate-700">{percent}%</span>
                       </div>
                    </div>
                    <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                       <div className={`${barColor} h-full rounded-full transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
                    </div>
                 </div>
               );
             })}
           </div>

           <button 
             onClick={startInteractiveSession}
             className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-1"
           >
             <Play className="w-5 h-5 fill-white" /> Iniciar Treinamento
           </button>
           
           <div className="text-center mt-4">
              <button onClick={onCancel} className="text-sm text-slate-400 hover:text-red-500 font-bold">Voltar</button>
           </div>
        </div>
      </div>
    );
  }

  // --- 3. SUMMARY PHASE ---
  if (phase === 'summary') {
    // Robust Score Calculation: Case insensitive check
    const score = questions.reduce((acc, q, idx) => {
        const u = userAnswers[idx] ? userAnswers[idx].trim().toLowerCase() : "";
        const c = q.correctAnswer ? q.correctAnswer.trim().toLowerCase() : "";
        return acc + (u === c ? 1 : 0);
    }, 0);

    const isInteractive = mode === 'interactive';
    
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
        {/* Header Results */}
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center border border-indigo-50 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
           
           <div className="mb-6">
             <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 text-green-600 rounded-full mb-4 shadow-sm border-4 border-white">
                <CheckCircle className="w-10 h-10" />
             </div>
             <h2 className="text-3xl font-black text-slate-900 mb-1">{isInteractive ? 'Relatório Semanal' : 'Ciclo Concluído!'}</h2>
             <p className="text-slate-500">Confira o detalhamento da sua evolução e os materiais gerados.</p>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <div className="text-3xl font-black text-indigo-600">{score}/{questions.length}</div>
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acertos Totais</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <div className="text-3xl font-black text-slate-700">{formatTime(timeElapsed)}</div>
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tempo Total</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <div className="text-3xl font-black text-emerald-500">{questions.length > 0 ? Math.round((score/questions.length)*100) : 0}%</div>
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acurácia</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <div className="text-3xl font-black text-purple-500">{availableTopics.length}</div>
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tópicos Vistos</div>
              </div>
           </div>
           
           {/* Auto-generated Flashcards Badge */}
           {isInteractive && (
             <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm font-bold animate-pulse">
               <Brain className="w-5 h-5" />
               Material de Revisão Espaçada (Flashcards) Gerado Automaticamente!
             </div>
           )}
        </div>

        {/* Detailed Skill Evolution */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
           <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <TrendingUp className="w-5 h-5 text-indigo-500" /> Evolução de Proficiência
              </h3>
              <span className="text-xs text-slate-400 font-medium">Comparativo Antes vs. Depois</span>
           </div>
           
           <div className="divide-y divide-slate-100">
              {availableTopics.map(topic => {
                 // Check initialSkills for start value. If topic didn't exist in initialSkills, assume default 0.1
                 const startM = initialSkills[topic.id]?.masteryProbability || 0.1;
                 const endM = localSkills[topic.id]?.masteryProbability || 0.1;
                 const startP = Math.round(startM * 100);
                 const endP = Math.round(endM * 100);
                 const delta = endP - startP;
                 
                 const stats = sessionStats[topic.id] || { correct: 0, total: 0 };
                 const topicScore = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                 
                 let feedbackText = "";
                 if (delta > 5) feedbackText = "Excelente salto qualitativo! Absorção rápida dos conceitos.";
                 else if (delta > 0) feedbackText = "Crescimento consistente. Continue revisando para fixar.";
                 else if (topicScore < 50 && stats.total > 0) feedbackText = "Detectamos dificuldades. Flashcards extras foram gerados.";
                 else if (stats.total === 0) feedbackText = "Tópico não abordado neste ciclo.";
                 else feedbackText = "Desempenho estável. Pronto para desafios maiores.";

                 return (
                   <div key={topic.id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
                         <div className="flex-grow">
                            <h4 className="font-bold text-slate-800 mb-1">{topic.name}</h4>
                            <div className="flex items-center gap-2 text-xs">
                               <span className={`px-2 py-0.5 rounded font-bold ${topicScore >= 70 ? 'bg-green-100 text-green-700' : topicScore >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                  {stats.correct}/{stats.total} Acertos
                               </span>
                               <span className="text-slate-400">|</span>
                               <span className="text-slate-500">{feedbackText}</span>
                            </div>
                         </div>
                         
                         <div className="w-full md:w-64">
                            <div className="flex justify-between text-xs font-bold mb-2">
                               <span className="text-slate-400">Proficiência</span>
                               <span className={`${delta > 0 ? 'text-green-600' : 'text-slate-500'}`}>
                                  {startP}% &rarr; {endP}% ({delta > 0 ? '+' : ''}{delta}%)
                               </span>
                            </div>
                            <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
                               {/* Background Bar (New Mastery) */}
                               <div className="absolute top-0 left-0 h-full bg-indigo-500 transition-all" style={{ width: `${endP}%` }}></div>
                               {/* Marker for Old Mastery */}
                               <div className="absolute top-0 bottom-0 w-0.5 bg-white z-10 opacity-50" style={{ left: `${startP}%` }}></div>
                            </div>
                         </div>
                      </div>
                   </div>
                 );
              })}
           </div>
        </div>

        <button onClick={handleExit} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-colors shadow-xl flex items-center justify-center gap-2">
           {isInteractive ? 'Salvar Relatório e Material' : 'Voltar ao Hub'} <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  if (!currentQ) return null; 

  // ... (Active phase renderer remains unchanged)
  // ... (Classic test renderer remains unchanged)
  
  // Re-declare for context below
  if (mode === 'interactive') {
    const isCurrentFav = isFavorite ? isFavorite(currentQ.id) : false;
    const currentTopicName = availableTopics[currentTopicIdx]?.name || 'Revisão Geral';

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Topic Context */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-indigo-100">
           <div>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Ciclo de Aprendizagem</span>
              <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                 {currentTopicName} 
                 <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-0.5 rounded-full">Q{questionsInTopic + 1}/{QUESTIONS_PER_TOPIC_CYCLE}</span>
              </h2>
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-500 font-mono text-sm">
                 <Clock className="w-4 h-4"/> {formatTime(timeElapsed)}
              </div>
              <button onClick={onCancel} className="text-gray-400 hover:text-red-500 text-sm font-bold">Sair</button>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden min-h-[400px] flex flex-col">
                 <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      currentQ.difficulty === Difficulty.BASIC ? 'bg-green-100 text-green-700' : 
                      currentQ.difficulty === Difficulty.INTERMEDIATE ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {translateDifficulty(currentQ.difficulty)}
                    </span>
                    {onToggleFavorite && (
                      <button onClick={() => onToggleFavorite(currentQ)} className="text-gray-300 hover:text-yellow-400 transition-colors">
                        <Star className={`w-5 h-5 ${isCurrentFav ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </button>
                    )}
                 </div>

                 <div className="p-8 flex-grow">
                    {/* Metadata for Concursos */}
                    {(currentQ.banca || currentQ.source) && (
                     <div className="mb-6 flex flex-wrap gap-2 pb-4 border-b border-gray-100">
                       {currentQ.banca && (
                         <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-bold uppercase tracking-tight">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            {currentQ.banca}
                         </div>
                       )}
                       {currentQ.source && (
                         <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 text-xs font-bold uppercase tracking-tight">
                            <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                            {currentQ.source}
                         </div>
                       )}
                     </div>
                    )}

                    {currentQ.visualization && <div className="mb-6"><Illustration data={currentQ.visualization} /></div>}
                    
                    <div className="text-xl text-gray-800 leading-relaxed mb-8">
                       <MathRenderer text={currentQ.text} />
                    </div>

                    {showMiniTheory && currentQ.miniTheory && (
                       <div className="mb-6 bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg animate-in slide-in-from-left-2">
                         <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-700 mb-2 uppercase">
                           <BookOpen className="w-4 h-4"/> Conceito Chave
                         </h4>
                         <div className="text-sm text-indigo-900"><MathRenderer text={currentQ.miniTheory} /></div>
                       </div>
                    )}

                    {hintsRevealed > 0 && currentQ.hints && (
                       <div className="mb-8 space-y-2">
                         {currentQ.hints.slice(0, hintsRevealed).map((hint, i) => (
                           <div key={i} className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800 flex gap-3 animate-in fade-in">
                              <Lightbulb className="w-4 h-4 flex-shrink-0 mt-1 text-yellow-600" />
                              <MathRenderer text={hint} />
                           </div>
                         ))}
                       </div>
                    )}

                    {!feedback ? (
                       <div className="space-y-4">
                          {currentQ.options ? (
                             <div className="grid grid-cols-1 gap-3">
                               {currentQ.options.map((opt, idx) => {
                                  const letter = String.fromCharCode(65 + idx);
                                  return (
                                    <button key={idx} onClick={() => setCurrentAnswer(opt)} className={`p-4 text-left rounded-xl border-2 transition-all ${currentAnswer === opt ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-gray-100 hover:border-gray-300'}`}>
                                       <span className="font-bold text-gray-400 mr-3">{letter}.</span> <MathRenderer text={opt} className="inline" />
                                    </button>
                                  );
                               })}
                             </div>
                          ) : (
                             <input type="text" value={currentAnswer} onChange={(e) => setCurrentAnswer(e.target.value)} className="w-full p-4 border rounded-xl" placeholder="Sua resposta..." />
                          )}
                          <button onClick={handleInteractiveSubmit} disabled={!currentAnswer} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50">
                             <Send className="w-4 h-4" /> Verificar
                          </button>
                       </div>
                    ) : (
                       <div className={`mt-6 p-6 rounded-xl border animate-in slide-in-from-bottom-4 ${feedback === 'correct' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="flex items-center gap-3 mb-4">
                             {feedback === 'correct' ? <CheckCircle className="w-8 h-8 text-green-600"/> : <XCircle className="w-8 h-8 text-red-600"/>}
                             <div>
                               <h3 className={`font-bold text-lg ${feedback === 'correct' ? 'text-green-800' : 'text-red-800'}`}>{feedback === 'correct' ? 'Correto!' : 'Incorreto'}</h3>
                               <p className="text-sm text-gray-600">Resposta: <strong><MathRenderer text={currentQ.correctAnswer} className="inline"/></strong></p>
                             </div>
                          </div>
                          <div className="bg-white/50 p-4 rounded-lg text-sm text-gray-800 leading-relaxed mb-4">
                             <MathRenderer text={currentQ.explanation} />
                          </div>
                          <button onClick={handleInteractiveNext} className="w-full py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
                             Continuar Ciclo <ArrowRight className="w-4 h-4" />
                          </button>
                       </div>
                    )}
                 </div>
              </div>
           </div>

           {/* Sidebar Tools */}
           <div className="space-y-4">
              <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-lg">
                 <h3 className="font-bold text-lg mb-4">Ferramentas</h3>
                 <div className="space-y-3">
                   <button onClick={() => setShowMiniTheory(!showMiniTheory)} disabled={!currentQ || feedback !== null} className="w-full flex items-center justify-between p-3 rounded-lg bg-indigo-800 hover:bg-indigo-700 border border-indigo-700 disabled:opacity-50 text-sm font-medium">
                     <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-indigo-300"/> Teoria</span>
                   </button>
                   <button onClick={() => setHintsRevealed(prev => Math.min(prev + 1, currentQ.hints?.length || 0))} disabled={!currentQ || !currentQ.hints || hintsRevealed >= currentQ.hints.length || feedback !== null} className="w-full flex items-center justify-between p-3 rounded-lg bg-indigo-800 hover:bg-indigo-700 border border-indigo-700 disabled:opacity-50 text-sm font-medium">
                     <span className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-400"/> Dica ({hintsRevealed}/{currentQ.hints?.length || 0})</span>
                   </button>
                 </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                 <h4 className="font-bold text-gray-800 text-sm mb-4">Progresso no Tópico</h4>
                 <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(localSkills[availableTopics[currentTopicIdx]?.id]?.masteryProbability || 0.1) * 100}%` }}></div>
                 </div>
                 <p className="text-xs text-gray-500">Nível estimado pela IA.</p>
              </div>
           </div>
        </div>
      </div>
    );
  }

  // --- CLASSIC TEST VIEW (Original) ---
  function topicId(q: Question) { return q.topicId || 'unknown'; }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
           <Clock className="w-5 h-5 text-gray-400" /> {formatTime(timeElapsed)}
         </h2>
         <div className="flex gap-1 overflow-x-auto max-w-md pb-2">
            {questions.map((_, idx) => (
              <div key={idx} className={`w-3 h-3 flex-shrink-0 rounded-full ${idx === currentIndex ? 'bg-indigo-600 ring-2 ring-indigo-200' : userAnswers[idx] ? 'bg-indigo-300' : 'bg-gray-200'}`} />
            ))}
         </div>
         <button onClick={onCancel} className="text-sm text-gray-400 hover:text-red-500 font-medium">Cancelar</button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 min-h-[400px] flex flex-col">
         <div className="p-8 border-b border-gray-100 flex-grow">
            <div className="flex justify-between items-start mb-6">
              <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1 rounded-full uppercase tracking-wider">Questão {currentIndex + 1}</span>
              <div className="text-right">
                <span className="block text-xs font-bold text-indigo-600">{config.style}</span>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold text-white uppercase ${currentQ.difficulty === Difficulty.BASIC ? 'bg-green-500' : currentQ.difficulty === Difficulty.INTERMEDIATE ? 'bg-blue-500' : 'bg-purple-500'}`}>
                  {translateDifficulty(currentQ.difficulty)}
                </span>
              </div>
            </div>

            {/* Metadata for Concursos - Classic Mode */}
            {(currentQ.banca || currentQ.source) && (
              <div className="mb-6 flex flex-wrap gap-2 pb-4 border-b border-gray-100">
                {currentQ.banca && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-bold uppercase tracking-tight">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    {currentQ.banca}
                  </div>
                )}
                {currentQ.source && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 text-xs font-bold uppercase tracking-tight">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                    {currentQ.source}
                  </div>
                )}
              </div>
            )}
            
            <div className="text-lg text-gray-900 leading-relaxed mb-8">
               <MathRenderer text={currentQ.text} />
            </div>

            <div className="space-y-3">
              {currentQ.options?.map((opt, idx) => {
                 const letter = String.fromCharCode(65 + idx);
                 return (
                  <button key={idx} onClick={() => handleSelectOptionClassic(currentQ.correctAnswer.length === 1 ? letter : opt)} className={`w-full p-4 text-left rounded-xl border-2 transition-all group ${userAnswers[currentIndex] === opt || (currentQ.correctAnswer.length === 1 && userAnswers[currentIndex] === letter) ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-gray-100 hover:border-indigo-200'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm ${userAnswers[currentIndex] === opt || (currentQ.correctAnswer.length === 1 && userAnswers[currentIndex] === letter) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>{letter}</div>
                      <div className="text-gray-800"><MathRenderer text={opt} /></div>
                    </div>
                  </button>
                 );
              })}
            </div>
         </div>

         <div className="p-6 bg-gray-50 rounded-b-2xl flex justify-between items-center">
            <button onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0} className="px-6 py-2 text-gray-600 font-bold disabled:opacity-30 hover:text-indigo-600">Anterior</button>
            {currentIndex === questions.length - 1 ? (
               <button onClick={handleFinishClassic} className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg flex items-center gap-2">Finalizar Prova <CheckCircle className="w-4 h-4"/></button>
            ) : (
               <button onClick={() => setCurrentIndex(prev => prev + 1)} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg flex items-center gap-2">Próxima <ArrowRight className="w-4 h-4"/></button>
            )}
         </div>
      </div>
    </div>
  );
};

export default SimulationSession;
