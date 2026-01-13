import React, { useState } from 'react';
import { 
  UserProgress, 
  TopicId, 
  SkillState,
  Interaction,
  SimulationConfig
} from './types';
import { 
  TOPICS_DATA, 
  DEFAULT_BKT_PARAMS 
} from './constants';
import { updateHierarchicalKnowledge } from './services/tracingService';
import SkillCard from './components/SkillCard';
import PracticeSession from './components/PracticeSession';
import ReportView from './components/ReportView';
import PlacementTest from './components/PlacementTest';
import SimulationHub from './components/SimulationHub';
import SimulationSession from './components/SimulationSession';
import { LayoutDashboard, Target, BarChart2 } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'practice' | 'report' | 'placement' | 'simulations' | 'simulation_session'>('placement');
  const [activeTopic, setActiveTopic] = useState<TopicId | null>(null);
  const [activeSimulation, setActiveSimulation] = useState<SimulationConfig | null>(null);
  
  // Initialize user progress
  const [progress, setProgress] = useState<UserProgress>(() => {
    const skills: { [key: string]: SkillState } = {};
    
    // Initialize all skills at basic level
    TOPICS_DATA.forEach(t => {
      skills[t.id] = {
        id: t.id,
        name: t.name,
        isParent: true,
        masteryProbability: DEFAULT_BKT_PARAMS.p_init, // Starts low
        totalAttempts: 0,
        correctStreak: 0,
        averageResponseTime: 0,
        subSkillIds: t.subSkills.map(s => s.id)
      };

      t.subSkills.forEach(sub => {
        skills[sub.id] = {
          id: sub.id,
          name: sub.name,
          isParent: false,
          masteryProbability: DEFAULT_BKT_PARAMS.p_init,
          totalAttempts: 0,
          correctStreak: 0,
          averageResponseTime: 0
        };
      });
    });

    return { 
      hasCompletedPlacement: false,
      skills, 
      history: [] 
    };
  });

  // Check if placement is needed on mount (mock check logic for this demo)
  React.useEffect(() => {
    if (!progress.hasCompletedPlacement) {
      setView('placement');
    } else {
      setView('dashboard');
    }
  }, [progress.hasCompletedPlacement]);

  const handlePlacementComplete = (results: Interaction[]) => {
    // Basic Heuristic: If they got > 50% right, bump starting mastery
    const correctCount = results.filter(r => r.isCorrect).length;
    const initialMastery = correctCount >= 2 ? 0.45 : 0.15; // Start at Intermediate or Basic

    setProgress(prev => {
      const newSkills = { ...prev.skills };
      
      // Update all skills with the placement result baseline
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

  const handleTopicSelect = (id: TopicId) => {
    setActiveTopic(id);
    setView('practice');
  };

  const handleInteractionComplete = (interaction: Interaction) => {
    setProgress(prev => {
      // 1. Update Hierarchical BKT
      const newSkills = updateHierarchicalKnowledge(prev.skills, interaction, DEFAULT_BKT_PARAMS);
      
      // 2. Add to history for DKT Analysis
      const newHistory = [...prev.history, interaction];

      return {
        ...prev,
        skills: newSkills,
        history: newHistory
      };
    });
  };

  const handleSimulationStart = (config: SimulationConfig) => {
    setActiveSimulation(config);
    setView('simulation_session');
  };

  const handleSimulationComplete = (interactions: Interaction[]) => {
    // Batch update knowledge state based on simulation results
    interactions.forEach(interaction => {
      handleInteractionComplete(interaction);
    });
    // Return to hub after saving
    setView('simulations');
    setActiveSimulation(null);
  };

  const getCurrentTopicData = () => {
    return TOPICS_DATA.find(t => t.id === activeTopic);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => progress.hasCompletedPlacement && setView('dashboard')}>
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold math-font">
                C!
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-800 hidden md:block">Combinatoria<span className="text-indigo-600">AI</span></span>
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
              <div className="bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Modo Adaptativo</span>
                <p className="font-bold text-indigo-900">Ativo</p>
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

export default App;