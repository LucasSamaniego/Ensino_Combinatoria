
import React, { useState, useEffect } from 'react';
import { 
  UserProgress, 
  TopicId, 
  Interaction,
  SimulationConfig,
  Question
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

import { LayoutDashboard, Target, BarChart2, Brain, ArrowLeft, Loader2, Book, Scale, GraduationCap, Star } from 'lucide-react';

interface CombinatoricsModuleProps {
  onExit: () => void;
  category: 'math' | 'concursos';
  subCategory?: string; // 'basic' | 'combinatorics' | undefined
}

const CombinatoricsModule: React.FC<CombinatoricsModuleProps> = ({ onExit, category, subCategory }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'practice' | 'report' | 'placement' | 'simulations' | 'simulation_session' | 'flashcards' | 'favorites'>('dashboard');
  
  const [activeTopic, setActiveTopic] = useState<TopicId | null>(null);
  const [activeSimulation, setActiveSimulation] = useState<SimulationConfig | null>(null);
  const [progress, setProgress] = useState<UserProgress>(getEmptyProgress());

  // Determine which topics to show based on category and subCategory
  const getCurrentTopics = () => {
    if (category === 'math') {
      if (subCategory === 'basic') return BASIC_MATH_TOPICS;
      if (subCategory === 'combinatorics') return COMBINATORICS_TOPICS;
      return MATH_TOPICS; // Fallback
    }
    return CONCURSOS_TOPICS;
  };

  const currentTopics = getCurrentTopics();
  const moduleTitle = subCategory === 'basic' ? 'Matemática Básica' : (subCategory === 'combinatorics' ? 'Análise Combinatória' : (category === 'math' ? 'Matemática' : 'Concursos'));

  // Carregamento Assíncrono do Progresso
  useEffect(() => {
    let isMounted = true;

    const initProgress = async () => {
      if (user) {
        setLoading(true);
        const data = await loadUserProgress(user.uid);
        if (isMounted) {
          setProgress(data);
          setView('dashboard');
          setLoading(false);
        }
      }
    };

    initProgress();

    return () => { isMounted = false; };
  }, [user, category, subCategory]);

  // Salvamento Automático (Debounced ou no efeito do progress)
  useEffect(() => {
    if (user && !loading) {
      // Salva sem bloquear a UI
      saveUserProgress(user.uid, progress).catch(console.error);
    }
  }, [progress, user, loading]);

  const handlePlacementComplete = (results: Interaction[]) => {
    const correctCount = results.filter(r => r.isCorrect).length;
    const initialMastery = correctCount >= 3 ? 0.65 : (correctCount >= 2 ? 0.45 : 0.15); 

    setProgress(prev => {
      const newSkills = { ...prev.skills };
      
      currentTopics.forEach(topic => {
        const currentM = newSkills[topic.id].masteryProbability;
        const newM = Math.max(currentM, initialMastery);

        newSkills[topic.id].masteryProbability = newM;
        topic.subSkills.forEach(sub => {
          newSkills[sub.id].masteryProbability = newM;
        });
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
    interactions.forEach(interaction => handleInteractionComplete(interaction));
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

  // Favorites Logic
  const handleToggleFavorite = (question: Question) => {
    setProgress(prev => {
      const isFav = prev.favorites.some(q => q.id === question.id);
      let newFavs;
      if (isFav) {
        newFavs = prev.favorites.filter(q => q.id !== question.id);
      } else {
        newFavs = [question, ...prev.favorites];
      }
      return { ...prev, favorites: newFavs };
    });
  };

  const handleRemoveFavorite = (questionId: string) => {
    setProgress(prev => ({
      ...prev,
      favorites: prev.favorites.filter(q => q.id !== questionId)
    }));
  };

  const isFavorite = (questionId: string) => {
    return progress.favorites.some(q => q.id === questionId);
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" /></div>;

  const dueCards = getCardsDue(progress.flashcards);
  const getCurrentTopicData = () => currentTopics.find(t => t.id === activeTopic);

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
          
          <div className="flex gap-1 md:gap-2 overflow-x-auto">
            <button onClick={() => setView('dashboard')} className={`p-2 rounded-lg ${view === 'dashboard' ? 'bg-slate-100' : ''}`} title="Painel"><LayoutDashboard className="w-5 h-5" /></button>
            <button onClick={() => setView('favorites')} className={`p-2 rounded-lg ${view === 'favorites' ? 'bg-slate-100' : ''}`} title="Favoritos"><Star className="w-5 h-5" /></button>
            <button onClick={() => setView('placement')} className={`p-2 rounded-lg ${view === 'placement' ? 'bg-slate-100' : ''}`} title="Teste de Nivelamento"><GraduationCap className="w-5 h-5" /></button>
            <button onClick={() => setView('simulations')} className={`p-2 rounded-lg ${view === 'simulations' ? 'bg-slate-100' : ''}`} title="Simulados"><Target className="w-5 h-5" /></button>
            <button onClick={() => setView('flashcards')} className={`p-2 rounded-lg relative ${view === 'flashcards' ? 'bg-slate-100' : ''}`} title="Revisão">
              <Brain className="w-5 h-5" />
              {dueCards.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
            </button>
            <button onClick={() => setView('report')} className={`p-2 rounded-lg ${view === 'report' ? 'bg-slate-100' : ''}`} title="Relatórios"><BarChart2 className="w-5 h-5" /></button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 py-8">
        {view === 'placement' && (
          <PlacementTest 
            category={category} 
            subCategory={subCategory}
            onComplete={handlePlacementComplete} 
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentTopics.map(topic => (
              <SkillCard 
                key={topic.id}
                topic={topic}
                parentStats={progress.skills[topic.id]} 
                allSkills={progress.skills} 
                onClick={handleTopicSelect}
              />
            ))}
            {currentTopics.length === 0 && (
              <div className="col-span-full text-center text-gray-400 py-12">
                Nenhum tópico encontrado para este módulo.
              </div>
            )}
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
          />
        )}
        {view === 'simulations' && <SimulationHub onSelect={handleSimulationStart} />}
        {view === 'simulation_session' && activeSimulation && (
          <SimulationSession 
            config={activeSimulation} 
            availableTopics={currentTopics}
            onComplete={handleSimulationComplete} 
            onCancel={() => setView('simulations')} 
          />
        )}
        {view === 'flashcards' && <FlashcardSession cards={dueCards} onReview={handleCardReview} onFinish={() => setView('dashboard')} />}
        {view === 'report' && <ReportView history={progress.history} onBack={() => setView('dashboard')} />}
      </main>
    </div>
  );
};

export default CombinatoricsModule;
