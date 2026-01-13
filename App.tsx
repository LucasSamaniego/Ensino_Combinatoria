
import React, { useState } from 'react';
import { BookOpen, Calculator, Beaker, Globe, Landmark, ChevronRight, Lock, LogOut, Video } from 'lucide-react';
import CombinatoricsModule from './components/CombinatoricsModule';
import OnlineClassroom from './components/OnlineClassroom';
import LoginScreen from './components/LoginScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';

type ViewState = 'hub' | 'subject_math' | 'module_combinatorics' | 'online_classroom';

const MainApp: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>('hub');

  if (loading) return <div className="min-h-screen bg-slate-50"></div>;
  if (!user) return <LoginScreen />;

  const renderHub = () => (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-in fade-in duration-500">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Plataforma de Estudos</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Olá, <span className="text-indigo-600 font-bold">{user.name.split(' ')[0]}</span>. Selecione uma disciplina para acessar materiais adaptativos e retomar seu progresso.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button 
          onClick={() => setCurrentView('subject_math')}
          className="group relative bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <Calculator className="w-24 h-24 text-indigo-600" />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-indigo-600">
              <Calculator className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-indigo-700">Matemática</h3>
            <p className="text-slate-500 text-sm mb-6">Álgebra, Geometria, Análise Combinatória e mais.</p>
            <span className="inline-flex items-center text-sm font-bold text-indigo-600 group-hover:gap-2 transition-all">
              Acessar Disciplina <ChevronRight className="w-4 h-4 ml-1" />
            </span>
          </div>
        </button>

        <div className="group relative bg-slate-50 p-8 rounded-2xl border border-slate-200 text-left opacity-75 cursor-not-allowed">
           <div className="absolute top-4 right-4 text-slate-300">
             <Lock className="w-5 h-5" />
           </div>
           <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center mb-6 text-slate-400">
              <Beaker className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-400 mb-2">Física</h3>
            <p className="text-slate-400 text-sm mb-6">Mecânica, Termodinâmica e Óptica.</p>
        </div>

        <div className="group relative bg-slate-50 p-8 rounded-2xl border border-slate-200 text-left opacity-75 cursor-not-allowed">
           <div className="absolute top-4 right-4 text-slate-300">
             <Lock className="w-5 h-5" />
           </div>
           <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center mb-6 text-slate-400">
              <Landmark className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-400 mb-2">História</h3>
            <p className="text-slate-400 text-sm mb-6">História Geral e do Brasil.</p>
        </div>
      </div>
    </div>
  );

  const renderMathSubject = () => (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-in slide-in-from-right-8 duration-500">
      <button 
        onClick={() => setCurrentView('hub')}
        className="mb-8 flex items-center text-slate-500 hover:text-slate-900 transition-colors font-medium"
      >
        <ChevronRight className="w-4 h-4 rotate-180 mr-1" /> Voltar para Disciplinas
      </button>

      <div className="flex items-center gap-4 mb-12">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
           <Calculator className="w-8 h-8" />
        </div>
        <div>
           <h1 className="text-4xl font-bold text-slate-900">Matemática</h1>
           <p className="text-slate-500">Ferramentas de ensino e trilhas de aprendizagem.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button 
          onClick={() => setCurrentView('module_combinatorics')}
          className="bg-white p-6 rounded-xl border border-slate-200 hover:border-indigo-500 hover:ring-2 hover:ring-indigo-200 transition-all text-left shadow-sm hover:shadow-md"
        >
           <h3 className="text-xl font-bold text-slate-900 mb-2">Análise Combinatória</h3>
           <p className="text-sm text-slate-600 mb-4">Trilha adaptativa, simulados e revisões.</p>
           <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
             <div className="bg-indigo-500 w-1/4 h-full"></div> 
           </div>
        </button>

        <button 
          onClick={() => setCurrentView('online_classroom')}
          className="bg-indigo-600 p-6 rounded-xl border border-indigo-700 hover:bg-indigo-700 transition-all text-left shadow-lg text-white"
        >
           <div className="flex justify-between items-start mb-4">
             <Video className="w-8 h-8 text-indigo-200" />
             <span className="text-xs font-bold uppercase tracking-wider bg-white/20 text-white px-2 py-1 rounded">Novo</span>
           </div>
           <h3 className="text-xl font-bold mb-2">Aulas Online</h3>
           <p className="text-sm text-indigo-100 mb-4">Ferramentas didáticas, Quadro Digital e IA para Professores.</p>
           <span className="text-xs font-bold">Acessar Estúdio &rarr;</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-serif">
      {currentView !== 'module_combinatorics' && currentView !== 'online_classroom' && (
        <nav className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20">
           <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xl cursor-pointer" onClick={() => setCurrentView('hub')}>
                 <BookOpen className="w-6 h-6 text-indigo-600" />
                 <span>Plataforma de <span className="text-indigo-600">Estudos</span></span>
              </div>
              <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
                 <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                    <span className="hidden sm:inline font-bold text-slate-700">{user.name}</span>
                    <button onClick={signOut} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><LogOut className="w-5 h-5" /></button>
                 </div>
              </div>
           </div>
        </nav>
      )}

      {currentView === 'hub' && renderHub()}
      {currentView === 'subject_math' && renderMathSubject()}
      {currentView === 'module_combinatorics' && (
        <CombinatoricsModule onExit={() => setCurrentView('subject_math')} />
      )}
      {currentView === 'online_classroom' && (
        <OnlineClassroom onExit={() => setCurrentView('subject_math')} />
      )}
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <MainApp />
  </AuthProvider>
);

export default App;
