import React, { useState, useEffect } from 'react';
import { 
  UserProgress, 
  TopicId, 
  Difficulty, 
  SimulationConfig, 
  SkillState, 
  Question, 
  Interaction, 
  Flashcard 
} from '../types';
import { 
  TOPICS_DATA, 
  BASIC_MATH_TOPICS, 
  COMBINATORICS_TOPICS, 
  CONCURSOS_TOPICS 
} from '../constants';
import { 
  updateHierarchicalKnowledge 
} from '../services/tracingService';
import { 
  generateFlashcards 
} from '../services/geminiService';
import { 
  getCardsDue, 
  calculateNextReview, 
  ReviewGrade 
} from '../services/srsService';

import SkillCard from './SkillCard';
import PracticeSession from './PracticeSession';
import SimulationHub from './SimulationHub';
import SimulationSession from './SimulationSession';
import FlashcardSession from './FlashcardSession';
import ReportView from './ReportView';
import FavoritesView from './FavoritesView';
import PlacementTest from './PlacementTest';

import { 
  Trophy, 
  Target, 
  BookOpen, 
  BarChart2, 
  Star, 
  ArrowLeft, 
  Brain, 
  Dumbbell 
} from 'lucide-react';

interface CombinatoricsModuleProps {
  category: 'math' | 'concursos';
  subCategory?: string;
  weeklyTopics: string[];
  weeklyTheme: string;
  initialProgress: UserProgress;
  onUpdateProgress: (p: UserProgress) => void;
  onExit: () => void;
}

const CombinatoricsModule: React.FC<CombinatoricsModuleProps> = ({ 
  category, 
  subCategory, 
  weeklyTopics, 
  weeklyTheme, 
  initialProgress, 
  onUpdateProgress, 
  onExit 
}) => {
  const [view, setView] = useState<'list' | 'practice' | 'simulation' | 'simulation_session' | 'flashcards' | 'report' | 'favorites' | 'placement'>('list');
  const [selectedTopicId, setSelectedTopicId] = useState<TopicId | null>(null);
  const [activeSimulation, setActiveSimulation] = useState<SimulationConfig | null>(null);
  const [currentWeeklyMinutes, setCurrentWeeklyMinutes] = useState(0);
  const [customSimulationTopics, setCustomSimulationTopics] = useState<{id: TopicId, name: string}[]>([]);
  
  // Use initialProgress directly
  const progress = initialProgress;

  // Determine which topics to show based on category/subCategory
  const getTopics = () => {
    if (category === 'concursos') return CONCURSOS_TOPICS;
    if (subCategory === 'basic') return BASIC_MATH_TOPICS;
    if (subCategory === 'combinatorics') return COMBINATORICS_TOPICS;
    return [...BASIC_MATH_TOPICS, ...COMBINATORICS_TOPICS];
  };

  const topics = getTopics();

  // Effect to handle 'weekly' subCategory entry
  useEffect(() => {
    if (subCategory === 'weekly') {
      startWeeklySession();
    }
  }, [subCategory]);

  const startWeeklySession = (currentData?: UserProgress) => {
     const dataToUse = currentData || progress;
     
     // Calculate accumulated time for this specific week
     let minutesStudied = 0;
     const activePlan = dataToUse.studyPlans.find(p => p.id === dataToUse.activePlanId);
     if (activePlan && weeklyTheme) {
        const weekData = activePlan.generatedSchedule.find(w => w.theme === weeklyTheme);
        if (weekData) {
           minutesStudied = weekData.studiedMinutes || 0;
        }
     }
     setCurrentWeeklyMinutes(minutesStudied);

     const weeklyConfig: SimulationConfig = {
       id: 'weekly_auto',
       title: weeklyTheme || 'Meta da Semana',
       description: 'Ciclo de aprendizagem adaptativa focado nos tópicos da semana.',
       style: 'School', 
       questionCount: 5, 
       difficulty: Difficulty.INTERMEDIATE 
     };
     
     // Robust Mapping: Try to find existing topic ID from name (Fuzzy Match)
     const topicsObjects = (weeklyTopics || []).map((tName, i) => {
        const normalizedInput = tName.toLowerCase().trim();
        
        // 1. Exact Match
        let found = TOPICS_DATA.find(ct => ct.name.toLowerCase() === normalizedInput);
        
        // 2. Partial Match
        if (!found) {
           found = TOPICS_DATA.find(ct => 
             ct.name.toLowerCase().includes(normalizedInput) || 
             normalizedInput.includes(ct.name.toLowerCase())
           );
        }

        // 3. Keyword Match
        if (!found) {
           if (normalizedInput.includes("adm")) found = TOPICS_DATA.find(ct => ct.id === TopicId.DIR_ADMINISTRATIVO);
           if (normalizedInput.includes("const")) found = TOPICS_DATA.find(ct => ct.id === TopicId.DIR_CONSTITUCIONAL);
           if (normalizedInput.includes("penal")) found = TOPICS_DATA.find(ct => ct.id === TopicId.DIR_PENAL);
           if (normalizedInput.includes("lógica") || normalizedInput.includes("logica")) found = TOPICS_DATA.find(ct => ct.id === TopicId.RACIOCINIO_LOGICO);
           if (normalizedInput.includes("combinatória")) found = TOPICS_DATA.find(ct => ct.id === TopicId.INTRO_COUNTING);
        }

        return {
           id: found ? found.id : `custom_weekly_${i}_${Date.now()}` as TopicId,
           name: found ? found.name : tName
        };
     });

     setCustomSimulationTopics(topicsObjects);
     setActiveSimulation(weeklyConfig);
     setView('simulation_session');
  };

  const handleSkillClick = (id: TopicId) => {
    setSelectedTopicId(id);
    setView('practice');
  };

  const handleSimulationSelect = (config: SimulationConfig) => {
    setActiveSimulation(config);
    setView('simulation_session');
  };

  const handlePracticeComplete = (interaction: Interaction) => {
    // 1. Update BKT
    const updatedSkills = updateHierarchicalKnowledge(
      progress.skills,
      interaction,
      { p_init: 0.1, p_transit: 0.15, p_slip: 0.1, p_guess: 0.2 }
    );

    // 2. Add to history
    const updatedHistory = [...progress.history, interaction];

    // 3. Update Progress
    const newProgress = {
      ...progress,
      skills: updatedSkills,
      history: updatedHistory
    };

    onUpdateProgress(newProgress);
  };

  const handleUpdateSkill = (interaction: Interaction) => {
    // Similar to handlePracticeComplete but for simulations (doesn't exit view)
    const updatedSkills = updateHierarchicalKnowledge(
      progress.skills,
      interaction,
      { p_init: 0.1, p_transit: 0.15, p_slip: 0.1, p_guess: 0.2 }
    );

    // Update time tracking if in weekly mode
    let updatedPlans = progress.studyPlans;
    if (subCategory === 'weekly' && weeklyTheme) {
      updatedPlans = progress.studyPlans.map(plan => {
        if (plan.id === progress.activePlanId) {
           const newSchedule = plan.generatedSchedule.map(week => {
             if (week.theme === weeklyTheme) {
               return { ...week, studiedMinutes: (week.studiedMinutes || 0) + (interaction.timeSpentSeconds / 60) };
             }
             return week;
           });
           return { ...plan, generatedSchedule: newSchedule };
        }
        return plan;
      });
    }

    onUpdateProgress({
      ...progress,
      skills: updatedSkills,
      history: [...progress.history, interaction],
      studyPlans: updatedPlans
    });
  };

  const handleSimulationComplete = (results: Interaction[]) => {
    // Batch update history
    const updatedHistory = [...progress.history, ...results];
    
    // Batch update skills (iterate)
    let currentSkills = { ...progress.skills };
    results.forEach(interaction => {
      currentSkills = updateHierarchicalKnowledge(
        currentSkills,
        interaction,
        { p_init: 0.1, p_transit: 0.15, p_slip: 0.1, p_guess: 0.2 }
      );
    });

    onUpdateProgress({
      ...progress,
      skills: currentSkills,
      history: updatedHistory
    });

    // Go back to list
    if (subCategory === 'weekly') {
      onExit(); // Go back to main timeline if weekly done
    } else {
      setView('list');
    }
  };

  const handleToggleFavorite = (question: Question) => {
    const exists = progress.favorites.some(f => f.id === question.id);
    let newFavorites;
    if (exists) {
      newFavorites = progress.favorites.filter(f => f.id !== question.id);
    } else {
      newFavorites = [...progress.favorites, question];
    }
    onUpdateProgress({ ...progress, favorites: newFavorites });
  };

  const isFavorite = (id: string) => progress.favorites.some(f => f.id === id);

  const getFlashcardsDue = () => getCardsDue(progress.flashcards);

  const handleFlashcardReview = (cardId: string, grade: ReviewGrade) => {
    const cardIndex = progress.flashcards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const card = progress.flashcards[cardIndex];
    const newSRS = calculateNextReview(card.srs, grade);
    
    const newFlashcards = [...progress.flashcards];
    newFlashcards[cardIndex] = { ...card, srs: newSRS };

    onUpdateProgress({ ...progress, flashcards: newFlashcards });
  };

  const activePlan = progress.studyPlans.find(p => p.id === progress.activePlanId);
  const studyContext = activePlan?.goal || (category === 'concursos' ? "Foco em Concursos Públicos e Bancas Variadas" : "Matemática Geral");

  // --- RENDERING ---

  if (view === 'practice' && selectedTopicId) {
    const topic = topics.find(t => t.id === selectedTopicId);
    if (topic) {
      return (
        <PracticeSession
          category={category}
          topicId={selectedTopicId}
          topicName={topic.name}
          topicSubSkills={topic.subSkills}
          userSkills={progress.skills}
          onCompleteQuestion={handlePracticeComplete}
          onBack={() => setView('list')}
          onToggleFavorite={handleToggleFavorite}
          isFavorite={isFavorite}
          studyGoalContext={studyContext}
        />
      );
    }
  }

  if (view === 'simulation_session' && activeSimulation) {
    const available = subCategory === 'weekly' ? customSimulationTopics : topics;
    
    return (
      <SimulationSession
        config={activeSimulation}
        category={category}
        availableTopics={available}
        userSkills={progress.skills}
        onComplete={handleSimulationComplete}
        onCancel={() => {
           if (subCategory === 'weekly') onExit();
           else setView('simulation');
        }}
        onUpdateSkill={handleUpdateSkill}
        onToggleFavorite={handleToggleFavorite}
        isFavorite={isFavorite}
        studyGoalContext={studyContext}
        weeklyStudiedMinutes={currentWeeklyMinutes}
      />
    );
  }

  if (view === 'simulation') {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <button onClick={() => setView('list')} className="mb-4 text-slate-500 hover:text-slate-800 flex items-center gap-2">
           <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <SimulationHub onSelect={handleSimulationSelect} />
      </div>
    );
  }

  if (view === 'flashcards') {
    return (
       <div className="max-w-4xl mx-auto p-4">
         <button onClick={() => setView('list')} className="mb-4 text-slate-500 hover:text-slate-800 flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
         </button>
         <FlashcardSession 
           cards={getFlashcardsDue()} 
           onReview={handleFlashcardReview} 
           onFinish={() => setView('list')} 
         />
       </div>
    );
  }

  if (view === 'report') {
    return <ReportView history={progress.history} onBack={() => setView('list')} />;
  }

  if (view === 'favorites') {
    return (
      <FavoritesView 
        favorites={progress.favorites} 
        onRemove={(id) => handleToggleFavorite({ id } as Question)} 
        onBack={() => setView('list')} 
      />
    );
  }

  if (view === 'placement') {
     return (
       <PlacementTest 
         category={category}
         subCategory={subCategory}
         onComplete={(results) => {
            handleSimulationComplete(results);
            setView('list');
         }}
       />
     );
  }

  // DEFAULT VIEW: LIST
  const flashcardsCount = getFlashcardsDue().length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in">
      {/* Header Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <button onClick={onExit} className="flex items-center text-slate-500 hover:text-slate-900 font-bold uppercase tracking-widest text-xs">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Painel
        </button>
        <div className="flex gap-4">
           <button onClick={() => setView('favorites')} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-yellow-600 hover:border-yellow-200 transition-all shadow-sm">
              <Star className="w-4 h-4" /> Favoritos ({progress.favorites.length})
           </button>
           <button onClick={() => setView('report')} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm">
              <BarChart2 className="w-4 h-4" /> Relatórios
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Content: Topic List */}
        <div className="md:col-span-2 space-y-6">
           <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                 <BookOpen className="w-6 h-6 text-indigo-600" />
                 Módulos de Estudo
              </h2>
              <span className="text-xs font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-500">{topics.length} Tópicos</span>
           </div>
           
           <div className="grid grid-cols-1 gap-4">
              {topics.map(topic => (
                <SkillCard
                  key={topic.id}
                  topic={topic}
                  parentStats={progress.skills[topic.id] || { 
                    id: topic.id, name: topic.name, isParent: true, masteryProbability: 0.1, totalAttempts: 0, correctStreak: 0, averageResponseTime: 0 
                  }}
                  allSkills={progress.skills}
                  onClick={handleSkillClick}
                />
              ))}
           </div>
        </div>

        {/* Sidebar: Actions */}
        <div className="space-y-6">
           {/* Flashcards CTA */}
           <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                 <Brain className="w-5 h-5" /> Revisão Espaçada
              </h3>
              <p className="text-indigo-100 text-sm mb-6">
                 {flashcardsCount > 0 
                   ? `Você tem ${flashcardsCount} cartões para revisar hoje.` 
                   : "Tudo em dia! Volte amanhã para mais revisões."}
              </p>
              <button 
                onClick={() => setView('flashcards')}
                disabled={flashcardsCount === 0}
                className="w-full py-3 bg-white text-indigo-900 font-bold rounded-xl hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                 {flashcardsCount > 0 ? "Iniciar Revisão" : "Sem Revisões"}
              </button>
           </div>

           {/* Simulations CTA */}
           <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                 <Target className="w-5 h-5 text-red-500" /> Simulados
              </h3>
              <p className="text-slate-500 text-sm mb-6">
                 Teste seus conhecimentos em provas completas estilo vestibular ou concurso.
              </p>
              <button 
                onClick={() => setView('simulation')}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
              >
                 Abrir Central de Provas
              </button>
           </div>

           {/* Placement CTA */}
           {subCategory !== 'weekly' && (
              <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 shadow-sm">
                 <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-emerald-600" /> Nivelamento
                 </h3>
                 <p className="text-emerald-700 text-sm mb-6">
                    Faça um teste rápido para calibrar a dificuldade das questões.
                 </p>
                 <button 
                   onClick={() => setView('placement')}
                   className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg"
                 >
                    Fazer Teste
                 </button>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default CombinatoricsModule;