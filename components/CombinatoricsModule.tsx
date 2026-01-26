
import React, { useState, useEffect } from 'react';
import { 
  UserProgress, 
  TopicId, 
  Interaction,
  SimulationConfig,
  Question,
  Difficulty,
  StudyPlan
} from '../types';
import { 
  BASIC_MATH_TOPICS,
  COMBINATORICS_TOPICS,
  MATH_TOPICS,
  CONCURSOS_TOPICS
} from '../constants';
import { updateHierarchicalKnowledge } from '../services/tracingService';
import { generateFlashcards } from '../services/geminiService';
import { getCardsDue, calculateNextReview, ReviewGrade } from '../services/srsService';
import { loadUserProgress, saveUserProgress, getEmptyProgress } from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';

import SkillCard from './SkillCard';
import PracticeSession from './PracticeSession';
import ReportView from './ReportView';
import PlacementTest from './PlacementTest';
import SimulationHub from './SimulationHub';
import SimulationSession from './SimulationSession';
import FlashcardSession from './FlashcardSession';
import FavoritesView from './FavoritesView';
import StudyPlanSetup from './StudyPlanSetup';

import { LayoutDashboard, Target, BarChart2, Brain, ArrowLeft, Loader2, Book, Scale, GraduationCap, Star, Lock, Sprout, ArrowRight } from 'lucide-react';

interface CombinatoricsModuleProps {
  onExit: () => void;
  category: 'math' | 'concursos';
  subCategory?: string; // 'basic' | 'combinatorics' | 'weekly' | undefined
  weeklyTopics?: string[]; // Topics from the weekly plan
  weeklyTheme?: string;
  initialProgress?: UserProgress; // New prop to prevent state loss
  onUpdateProgress?: (progress: UserProgress) => void;
}

const CombinatoricsModule: React.FC<CombinatoricsModuleProps> = ({ 
  onExit, 
  category, 
  subCategory, 
  weeklyTopics, 
  weeklyTheme,
  initialProgress,
  onUpdateProgress 
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'practice' | 'report' | 'placement_intro' | 'placement' | 'plan_setup_internal' | 'simulations' | 'simulation_session' | 'flashcards' | 'favorites'>('dashboard');
  
  const [activeTopic, setActiveTopic] = useState<TopicId | null>(null);
  const [activeSimulation, setActiveSimulation] = useState<SimulationConfig | null>(null);
  const [progress, setProgress] = useState<UserProgress>(initialProgress || getEmptyProgress());
  
  const [customSimulationTopics, setCustomSimulationTopics] = useState<{ id: TopicId; name: string }[] | null>(null);

  // Limpeza de segurança ao trocar de categoria/subcategoria
  useEffect(() => {
    setActiveTopic(null);
    setActiveSimulation(null);
    setCustomSimulationTopics(null);
    // Se o user tinha um view de 'practice' ativo, forçamos volta ao dashboard para evitar erro
    if (view === 'practice' || view === 'simulation_session') {
      setView('dashboard');
    }
  }, [category, subCategory]);

  const getCurrentTopics = () => {
    if (category === 'math') {
      if (subCategory === 'basic') return BASIC_MATH_TOPICS;
      if (subCategory === 'combinatorics') return COMBINATORICS_TOPICS;
      return MATH_TOPICS; 
    }
    return CONCURSOS_TOPICS;
  };

  const currentTopics = getCurrentTopics();
  let moduleTitle = '';
  
  if (subCategory === 'basic') moduleTitle = 'Matemática Básica';
  else if (subCategory === 'combinatorics') moduleTitle = 'Análise Combinatória';
  else if (subCategory === 'weekly') moduleTitle = 'Plano Semanal';
  else moduleTitle = category === 'math' ? 'Matemática' : 'Concursos';

  const getVisibleTopics = () => {
    if (subCategory === 'weekly' || subCategory === 'basic') return currentTopics;

    if (progress.studyPlan && progress.studyPlan.category === category) {
      const planTopics = new Set(
        progress.studyPlan.generatedSchedule.flatMap(w => w.topicsToStudy)
      );
      return currentTopics.filter(t => planTopics.has(t.name));
    }

    return currentTopics;
  };

  const visibleTopics = getVisibleTopics();

  useEffect(() => {
    let isMounted = true;

    const initProgress = async () => {
      if (initialProgress) {
         if (isMounted) {
            setProgress(initialProgress);
            handleViewRouting(initialProgress);
            setLoading(false);
         }
         return;
      }

      if (user) {
        setLoading(true);
        const data = await loadUserProgress(user.uid);
        if (isMounted) {
          setProgress(data);
          handleViewRouting(data);
          setLoading(false);
        }
      }
    };

    initProgress();

    return () => { isMounted = false; };
  }, [user, category, subCategory, initialProgress]);

  const handleViewRouting = (data: UserProgress) => {
    if (!data.hasCompletedPlacement) {
      setView('placement_intro');
      return;
    }

    const hasPlanForCategory = data.studyPlan && data.studyPlan.category === category;
    if (data.hasCompletedPlacement && !hasPlanForCategory) {
       setView('plan_setup_internal');
       return;
    }

    if (subCategory === 'weekly' && weeklyTopics && weeklyTopics.length > 0) {
      startWeeklySession();
      return;
    }

    setView('dashboard');
  };

  const startWeeklySession = () => {
     const weeklyConfig: SimulationConfig = {
       id: 'weekly_auto',
       title: weeklyTheme || 'Meta da Semana',
       description: 'Ciclo de aprendizagem adaptativa focado nos tópicos da semana.',
       style: 'School', 
       questionCount: 5, 
       difficulty: Difficulty.INTERMEDIATE 
     };
     
     const topicsObjects = (weeklyTopics || []).map((tName, i) => {
        const found = currentTopics.find(ct => ct.name === tName);
        return {
           id: found ? found.id : `week_topic_${i}` as TopicId,
           name: tName
        };
     });

     setCustomSimulationTopics(topicsObjects);
     setActiveSimulation(weeklyConfig);
     setView('simulation_session');
  };

  useEffect(() => {
    if (user && !loading) {
      saveUserProgress(user.uid, progress).catch(console.error);
    }
  }, [progress, user, loading]);

  const handleStartFromZero = () => {
    const newProgress = { ...progress, hasCompletedPlacement: true };
    setProgress(newProgress);
    setView('plan_setup_internal'); 
  };

  const handlePlacementComplete = (results: Interaction[]) => {
    const correctCount = results.filter(r => r.isCorrect).length;
    const initialMastery = correctCount >= 3 ? 0.65 : (correctCount >= 2 ? 0.45 : 0.15); 

    const newSkills = { ...progress.skills };
      
    currentTopics.forEach(topic => {
      const currentM = newSkills[topic.id].masteryProbability;
      const newM = Math.max(currentM, initialMastery);

      newSkills[topic.id].masteryProbability = newM;
      topic.subSkills.forEach(sub => {
        newSkills[sub.id].masteryProbability = newM;
      });
    });

    const newProgress: UserProgress = {
      ...progress,
      hasCompletedPlacement: true,
      skills: newSkills,
      history: [...progress.history, ...results]
    };

    setProgress(newProgress);
    setView('plan_setup_internal');
  };

  const handlePlanCreatedInternal = async (plan: StudyPlan) => {
    const updatedProgress = { ...progress, studyPlan: plan };
    setProgress(updatedProgress);
    if (onUpdateProgress) onUpdateProgress(updatedProgress);
    setView('dashboard');
  };

  const handleTopicSelect = async (id: TopicId) => {
    setActiveTopic(id);
    const hasCards = progress.flashcards.some(c => c.topicId === id);
    if (!hasCards) {
      generateFlashcards(id).then(newCards => {
        const updated = {
          ...progress,
          flashcards: [...progress.flashcards, ...newCards]
        };
        setProgress(updated);
        if (onUpdateProgress) onUpdateProgress(updated);
      });
    }
    setView('practice');
  };

  const handleInteractionComplete = (interaction: Interaction) => {
    const newSkills = updateHierarchicalKnowledge(progress.skills, interaction, { p_init: 0.1, p_transit: 0.2, p_slip: 0.1, p_guess: 0.2 });
    const newHistory = [...progress.history, interaction];
    const updated = { ...progress, skills: newSkills, history: newHistory };
    
    setProgress(updated);
    if (onUpdateProgress) onUpdateProgress(updated);
  };

  const handleSimulationStart = (config: SimulationConfig) => {
    setActiveSimulation(config);
    setCustomSimulationTopics(null); 
    setView('simulation_session');
  };

  const handleSimulationComplete = async (interactions: Interaction[]) => {
    // 1. Consolida o progresso FINAL antes de sair
    let currentProgress = { ...progress };

    if (subCategory !== 'weekly') {
      interactions.forEach(interaction => {
         const newSkills = updateHierarchicalKnowledge(currentProgress.skills, interaction, { p_init: 0.1, p_transit: 0.2, p_slip: 0.1, p_guess: 0.2 });
         const newHistory = [...currentProgress.history, interaction];
         currentProgress = { ...currentProgress, skills: newSkills, history: newHistory };
      });
    } else {
      // Se for modo semanal, as habilidades já foram atualizadas via handleInteractionComplete (passado como onUpdateSkill)
      // Mas precisamos gerar Flashcards para os tópicos praticados
      const topicsPracticed = new Set(interactions.map(i => i.topicId));
      let newCards = [...currentProgress.flashcards];
      
      // Gera flashcards em paralelo para os tópicos que ainda não têm cartões
      const promises = Array.from(topicsPracticed).map(async (tId) => {
        const hasCards = newCards.some(c => c.topicId === tId);
        if (!hasCards) {
          const generated = await generateFlashcards(tId);
          return generated;
        }
        return [];
      });

      const generatedBatches = await Promise.all(promises);
      generatedBatches.forEach(batch => {
        newCards = [...newCards, ...batch];
      });

      currentProgress = { ...currentProgress, flashcards: newCards };
    }
    
    setProgress(currentProgress);
    
    // Força sincronização com App.tsx e Backend
    if (onUpdateProgress) onUpdateProgress(currentProgress);
    if (user) saveUserProgress(user.uid, currentProgress);
    
    // 2. Navegação
    if (subCategory === 'weekly') {
      // Se acabou a semana, sai do módulo
      onExit();
    } else {
      // Se foi simulado avulso, volta pro hub
      setView('simulations');
      setActiveSimulation(null);
    }
  };

  const handleCardReview = (cardId: string, grade: ReviewGrade) => {
    const newDeck = progress.flashcards.map(card => {
      if (card.id === cardId) {
        return { ...card, srs: calculateNextReview(card.srs, grade) };
      }
      return card;
    });
    const updated = { ...progress, flashcards: newDeck };
    setProgress(updated);
    if (onUpdateProgress) onUpdateProgress(updated);
  };

  const handleToggleFavorite = (question: Question) => {
    const isFav = progress.favorites.some(q => q.id === question.id);
    let newFavs;
    if (isFav) {
      newFavs = progress.favorites.filter(q => q.id !== question.id);
    } else {
      newFavs = [question, ...progress.favorites];
    }
    const updated = { ...progress, favorites: newFavs };
    setProgress(updated);
    if (onUpdateProgress) onUpdateProgress(updated);
  };

  const handleRemoveFavorite = (questionId: string) => {
    const updated = {
      ...progress,
      favorites: progress.favorites.filter(q => q.id !== questionId)
    };
    setProgress(updated);
    if (onUpdateProgress) onUpdateProgress(updated);
  };

  const isFavorite = (questionId: string) => {
    return progress.favorites.some(q => q.id === questionId);
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" /></div>;

  const dueCards = getCardsDue(progress.flashcards);
  const getCurrentTopicData = () => currentTopics.find(t => t.id === activeTopic);

  // Extract study plan goal to pass as context for question generation
  const studyGoalContext = progress.studyPlan && progress.studyPlan.category === category ? progress.studyPlan.goal : undefined;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <button onClick={onExit} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
             <div className="flex items-center gap-3">
                <div className={`w-8 h-8 ${category === 'math' ? 'bg-indigo-600' : 'bg-emerald-600'} rounded-lg flex items-center justify-center text-white font-bold`}>
                  {category === 'math' ? <Book className="w-4 h-4" /> : <Scale className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="font-bold text-sm tracking-tight">{moduleTitle}</h2>
                  <span className="text-[10px] text-slate-400 uppercase font-black">Módulo Ativo</span>
                </div>
             </div>
          </div>
          
          {subCategory !== 'weekly' && view !== 'placement_intro' && view !== 'plan_setup_internal' && (
            <div className="flex gap-1 md:gap-2 overflow-x-auto">
              <button onClick={() => setView('dashboard')} className={`p-2 rounded-lg ${view === 'dashboard' ? 'bg-slate-100' : ''}`} title="Painel"><LayoutDashboard className="w-5 h-5" /></button>
              <button onClick={() => setView('favorites')} className={`p-2 rounded-lg ${view === 'favorites' ? 'bg-slate-100' : ''}`} title="Favoritos"><Star className="w-5 h-5" /></button>
              <button onClick={() => setView('placement')} className={`p-2 rounded-lg ${view === 'placement' ? 'bg-slate-100' : ''}`} title="Refazer Nivelamento"><GraduationCap className="w-5 h-5" /></button>
              <button onClick={() => setView('simulations')} className={`p-2 rounded-lg ${view === 'simulations' ? 'bg-slate-100' : ''}`} title="Simulados"><Target className="w-5 h-5" /></button>
              <button onClick={() => setView('flashcards')} className={`p-2 rounded-lg relative ${view === 'flashcards' ? 'bg-slate-100' : ''}`} title="Revisão">
                <Brain className="w-5 h-5" />
                {dueCards.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
              </button>
              <button onClick={() => setView('report')} className={`p-2 rounded-lg ${view === 'report' ? 'bg-slate-100' : ''}`} title="Relatórios"><BarChart2 className="w-5 h-5" /></button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 py-8">
        
        {view === 'placement_intro' && (
          <div className="max-w-4xl mx-auto text-center py-12 animate-in fade-in duration-500">
            <h1 className="text-3xl font-black text-slate-900 mb-4">Bem-vindo à sua Trilha</h1>
            <p className="text-slate-500 max-w-lg mx-auto mb-12">
              Para criarmos o plano de estudo ideal, precisamos entender seu ponto de partida. Como você prefere começar?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              <button 
                onClick={handleStartFromZero}
                className="group flex flex-col items-center bg-white p-8 rounded-3xl border-2 border-slate-200 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Sprout className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Começar do Zero</h3>
                <p className="text-sm text-slate-500 text-center mb-6">
                  Nunca estudei este assunto ou quero rever tudo desde a base.
                </p>
                <div className="mt-auto flex items-center text-sm font-bold text-emerald-600 uppercase tracking-widest">
                  Criar Plano Básico <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              <button 
                onClick={() => setView('placement')}
                className="group flex flex-col items-center bg-white p-8 rounded-3xl border-2 border-slate-200 hover:border-indigo-500 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Teste de Nivelamento</h3>
                <p className="text-sm text-slate-500 text-center mb-6">
                  Já tenho algum conhecimento e quero pular conteúdos básicos.
                </p>
                <div className="mt-auto flex items-center text-sm font-bold text-indigo-600 uppercase tracking-widest">
                  Fazer Avaliação <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        )}

        {view === 'placement' && (
          <PlacementTest 
            category={category} 
            subCategory={subCategory}
            onComplete={handlePlacementComplete} 
          />
        )}
        
        {view === 'plan_setup_internal' && (
          <StudyPlanSetup 
            progress={progress} 
            onPlanCreated={handlePlanCreatedInternal} 
            category={category} 
          />
        )}

        {view === 'favorites' && (
          <FavoritesView 
            favorites={progress.favorites}
            onRemove={handleRemoveFavorite}
            onBack={() => setView('dashboard')}
          />
        )}
        {view === 'dashboard' && (
          <div className="space-y-6">
            {progress.studyPlan && progress.studyPlan.category === category && visibleTopics.length < currentTopics.length && (
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex items-center gap-3">
                <Lock className="w-5 h-5 text-indigo-600" />
                <div className="text-sm text-indigo-900">
                  <span className="font-bold">Modo Focado:</span> Exibindo apenas os tópicos presentes no seu Plano de Estudos: <strong>{progress.studyPlan.goal}</strong>.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleTopics.map(topic => (
                <SkillCard 
                  key={topic.id}
                  topic={topic}
                  parentStats={progress.skills[topic.id]} 
                  allSkills={progress.skills} 
                  onClick={handleTopicSelect}
                />
              ))}
              {visibleTopics.length === 0 && (
                <div className="col-span-full text-center text-gray-400 py-12">
                  Nenhum tópico encontrado para este módulo ou plano de estudos.
                </div>
              )}
            </div>
          </div>
        )}
        {view === 'practice' && activeTopic && (
          <PracticeSession 
            category={category}
            topicId={activeTopic}
            topicName={getCurrentTopicData()?.name || ''}
            topicSubSkills={getCurrentTopicData()?.subSkills || []}
            userSkills={progress.skills}
            onCompleteQuestion={handleInteractionComplete}
            onBack={() => setView('dashboard')}
            onToggleFavorite={handleToggleFavorite}
            isFavorite={isFavorite}
            studyGoalContext={studyGoalContext} // PASSING CONTEXT HERE
          />
        )}
        {view === 'simulations' && <SimulationHub onSelect={handleSimulationStart} />}
        {view === 'simulation_session' && activeSimulation && (
          <SimulationSession 
            config={activeSimulation} 
            category={category}
            availableTopics={customSimulationTopics || currentTopics}
            userSkills={progress.skills} 
            onComplete={handleSimulationComplete} 
            onCancel={() => subCategory === 'weekly' ? onExit() : setView('simulations')}
            onUpdateSkill={handleInteractionComplete} 
            onToggleFavorite={handleToggleFavorite} 
            isFavorite={isFavorite}
          />
        )}
        {view === 'flashcards' && <FlashcardSession cards={dueCards} onReview={handleCardReview} onFinish={() => setView('dashboard')} />}
        {view === 'report' && <ReportView history={progress.history} onBack={() => setView('dashboard')} />}
      </main>
    </div>
  );
};

export default CombinatoricsModule;
