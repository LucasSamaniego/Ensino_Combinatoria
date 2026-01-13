
import React, { useState, useEffect } from 'react';
import { 
  UserProgress, 
  TopicId, 
  Interaction,
  SimulationConfig
} from '../types';
import { 
  TOPICS_DATA
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

import { LayoutDashboard, Target, BarChart2, Brain, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';

interface CombinatoricsModuleProps {
  onExit: () => void;
}

const CombinatoricsModule: React.FC<CombinatoricsModuleProps> = ({ onExit }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'practice' | 'report' | 'placement' | 'simulations' | 'simulation_session' | 'flashcards'>('dashboard');
  
  const [activeTopic, setActiveTopic] = useState<TopicId | null>(null);
  const [activeSimulation, setActiveSimulation] = useState<SimulationConfig | null>(null);
  
  // Initialize state with empty structure, will populate via useEffect
  const [progress, setProgress] = useState<UserProgress>(getEmptyProgress());

  // 1. Load Data on Mount
  useEffect(() => {
    if (user) {
      setLoading(true);
      const data = loadUserProgress(user.uid);
      setProgress(data);
      
      // Determine initial view based on data
      if (!data.hasCompletedPlacement) {
        setView('placement');
      } else {
        setView('dashboard');
      }
      setLoading(false);
    }
  }, [user]);

  // 2. Save Data on Change
  useEffect(() => {
    if (user && !loading) {
      saveUserProgress(user.uid, progress);
    }
  }, [progress, user, loading]);

  // Load initial flashcards for basic topics if empty (Simulation)
  useEffect(() => {
    if (!loading && progress.hasCompletedPlacement && progress.flashcards.length === 0) {
      generateFlashcards(TopicId.INTRO_COUNTING).then(cards => {
        if (cards.length > 0) {
          setProgress(prev => ({
            ...prev,
            flashcards: [...prev.flashcards, ...cards]
          }));
        }
      });
    }
  }, [progress.hasCompletedPlacement, loading, progress.flashcards.length]);

  const handlePlacementComplete = (results: Interaction[]) => {
    const correctCount = results.filter(r => r.isCorrect).length;
    const initialMastery = correctCount >= 2 ? 0.45 : 0.15; 

    setProgress(prev => {
      const newSkills = { ...prev.skills };
      Object.keys(newSkills).forEach(key => {
        newSkills[key].masteryProbability = initialMastery;
      });
      return {
        ...prev,
        hasCompletedPlacement: true,
        skills: newSkills,
        history: [...prev.history, ...results]
      };
    });
    
    setView('dashboard');
  };

  const handleTopicSelect = async (id: TopicId) => {
    setActiveTopic(id);
    const hasCards = progress.flashcards.some(c => c.topicId === id);
    if (!hasCards) {
      generateFlashcards(id).then(newCards => {
        setProgress(prev => ({
          ...prev,
          flashcards: [...prev.flashcards, ...newCards]
        }));
      });
    }
    setView('practice');
  };

  const handleInteractionComplete = (interaction: Interaction) => {
    setProgress(prev => {
      const newSkills = updateHierarchicalKnowledge(prev.skills, interaction, { p_init: 0.1, p_transit: 0.15, p_slip: 0.1, p_guess: 0.2 });
      const newHistory = [...prev.history, interaction];
      return { ...prev, skills: newSkills, history: newHistory };
    });
  };

  const handleSimulationStart = (config: SimulationConfig) => {
    setActiveSimulation(config);
    setView('simulation_session');
  };

  const handleSimulationComplete = (interactions: Interaction[]) => {
    interactions.forEach(interaction => {
      handleInteractionComplete(interaction);
    });
    setView('simulations');
    setActiveSimulation(null);
  };

  const handleCardReview = (cardId: string, grade: ReviewGrade) => {
    setProgress(prev => {
      const newDeck = prev.flashcards.map(card => {
        if (card.id === cardId) {
          return { ...card, srs: calculateNextReview(card.srs, grade) };
        }
        return card;
      });
      return { ...prev, flashcards: newDeck };
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-600">Sincronizando seu perfil...</p>
      </div>
    );
  }

  const dueCards = getCardsDue(progress.flashcards);
  const getCurrentTopicData = () => TOPICS_DATA.find(t => t.id === activeTopic);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 animate-in fade-in duration-300">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
               <button onClick={onExit} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors" title="Voltar às Disciplinas">
                 <ArrowLeft className="w-5 h-5" />
               </button>
               <div className="flex items-center gap-3 cursor-pointer" onClick={() => progress.hasCompletedPlacement && setView('dashboard')}>
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold math-font">
                  C!
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg tracking-tight text-slate-800 leading-tight">Análise Combinatória</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">Módulo de Matemática</span>
                </div>
              </div>
            </div>
            
            {progress.hasCompletedPlacement && (
              <div className="flex items-center gap-1 md:gap-4">
                <button 
                  onClick={() => setView('dashboard')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <LayoutDashboard className="w-4 h-4" /> <span className="hidden md:inline">Trilha</span>
                </button>
                <button 
                  onClick={() => setView('simulations')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'simulations' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <Target className="w-4 h-4" /> <span className="hidden md:inline">Simulados</span>
                </button>
                <button 
                  onClick={() => setView('flashcards')}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'flashcards' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <Brain className="w-4 h-4" /> <span className="hidden md:inline">Revisão</span>
                  {dueCards.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                      {dueCards.length}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setView('report')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'report' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <BarChart2 className="w-4 h-4" /> <span className="hidden md:inline">Relatórios</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {view === 'placement' && (
          <PlacementTest onComplete={handlePlacementComplete} />
        )}

        {view === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Sua Trilha de Conhecimento</h2>
                <p className="text-slate-500 max-w-2xl mt-1">
                  O sistema identificou seu nível e adaptou o conteúdo.
                  Selecione um tópico para continuar evoluindo rumo ao nível Olímpico.
                </p>
              </div>
              <div className="flex gap-4">
                 {dueCards.length > 0 ? (
                    <button 
                      onClick={() => setView('flashcards')}
                      className="bg-white border-2 border-indigo-100 px-4 py-2 rounded-lg shadow-sm hover:border-indigo-300 flex items-center gap-2 text-indigo-800"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="font-bold">{dueCards.length} Revisões Pendentes</span>
                    </button>
                 ) : (
                   <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="text-xs font-bold text-green-700 uppercase">Tudo revisado</span>
                   </div>
                 )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {TOPICS_DATA.map(topic => (
                <SkillCard 
                  key={topic.id}
                  topic={topic}
                  parentStats={progress.skills[topic.id]} // Pass parent stats
                  allSkills={progress.skills} // Pass all skills to lookup children
                  onClick={handleTopicSelect}
                />
              ))}
            </div>
          </div>
        )}

        {view === 'practice' && activeTopic && (
          <PracticeSession 
            topicId={activeTopic}
            topicName={getCurrentTopicData()?.name || ''}
            topicSubSkills={getCurrentTopicData()?.subSkills || []}
            userSkills={progress.skills}
            onCompleteQuestion={handleInteractionComplete}
            onBack={() => setView('dashboard')}
          />
        )}

        {view === 'simulations' && (
          <SimulationHub onSelect={handleSimulationStart} />
        )}

        {view === 'simulation_session' && activeSimulation && (
          <SimulationSession 
             config={activeSimulation}
             onComplete={handleSimulationComplete}
             onCancel={() => setView('simulations')}
          />
        )}

        {view === 'flashcards' && (
          <FlashcardSession 
            cards={dueCards}
            onReview={handleCardReview}
            onFinish={() => setView('dashboard')}
          />
        )}

        {view === 'report' && (
          <ReportView 
            history={progress.history}
            onBack={() => setView('dashboard')}
          />
        )}

      </main>
    </div>
  );
};

export default CombinatoricsModule;
