import React, { useState } from 'react';
import { BookOpen, Calculator, Beaker, Globe, Landmark, ChevronRight, Lock } from 'lucide-react';
import CombinatoricsModule from './components/CombinatoricsModule';

type ViewState = 'hub' | 'subject_math' | 'module_combinatorics';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('hub');

  // --- Views ---

  const renderHub = () => (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-in fade-in duration-500">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Plataforma de Estudos</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Selecione uma disciplina para acessar materiais adaptativos, simulados inteligentes e acompanhamento de desempenho.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Math Card */}
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

        {/* Physics Card (Disabled) */}
        <div className="group relative bg-slate-50 p-8 rounded-2xl border border-slate-200 text-left opacity-75 cursor-not-allowed">
           <div className="absolute top-4 right-4 text-slate-300">
             <Lock className="w-5 h-5" />
           </div>
           <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center mb-6 text-slate-400">
              <Beaker className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-400 mb-2">Física</h3>
            <p className="text-slate-400 text-sm mb-6">Mecânica, Termodinâmica e Óptica.</p>
            <span className="inline-flex items-center text-sm font-bold text-slate-400">
              Em breve
            </span>
        </div>

        {/* History Card (Disabled) */}
        <div className="group relative bg-slate-50 p-8 rounded-2xl border border-slate-200 text-left opacity-75 cursor-not-allowed">
           <div className="absolute top-4 right-4 text-slate-300">
             <Lock className="w-5 h-5" />
           </div>
           <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center mb-6 text-slate-400">
              <Landmark className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-400 mb-2">História</h3>
            <p className="text-slate-400 text-sm mb-6">História Geral e do Brasil.</p>
            <span className="inline-flex items-center text-sm font-bold text-slate-400">
              Em breve
            </span>
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
           <p className="text-slate-500">Selecione um módulo para iniciar seus estudos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Module: Combinatorics */}
        <button 
          onClick={() => setCurrentView('module_combinatorics')}
          className="bg-white p-6 rounded-xl border border-slate-200 hover:border-indigo-500 hover:ring-2 hover:ring-indigo-200 transition-all text-left shadow-sm hover:shadow-md"
        >
           <div className="flex justify-between items-start mb-4">
             <span className="text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-1 rounded">Disponível</span>
           </div>
           <h3 className="text-xl font-bold text-slate-900 mb-2">Análise Combinatória</h3>
           <p className="text-sm text-slate-600 mb-4">
             Princípios de contagem, permutações, combinações e probabilidade. Sistema adaptativo com IA.
           </p>
           <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
             <div className="bg-indigo-500 w-1/4 h-full"></div> 
           </div>
           <p className="text-xs text-slate-400 mt-2">Progresso Salvo</p>
        </button>

        {/* Module: Geometry (Disabled) */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-left opacity-60">
           <div className="flex justify-between items-start mb-4">
             <span className="text-xs font-bold uppercase tracking-wider bg-slate-200 text-slate-500 px-2 py-1 rounded">Em Breve</span>
           </div>
           <h3 className="text-xl font-bold text-slate-500 mb-2">Geometria Plana</h3>
           <p className="text-sm text-slate-500 mb-4">
             Áreas, perímetros, semelhança de triângulos e círculos.
           </p>
        </div>

         {/* Module: Functions (Disabled) */}
         <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-left opacity-60">
           <div className="flex justify-between items-start mb-4">
             <span className="text-xs font-bold uppercase tracking-wider bg-slate-200 text-slate-500 px-2 py-1 rounded">Em Breve</span>
           </div>
           <h3 className="text-xl font-bold text-slate-500 mb-2">Funções</h3>
           <p className="text-sm text-slate-500 mb-4">
             Afim, Quadrática, Exponencial e Logarítmica.
           </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-serif">
      {/* Top Bar for Hub Navigation */}
      {currentView !== 'module_combinatorics' && (
        <nav className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20">
           <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xl cursor-pointer" onClick={() => setCurrentView('hub')}>
                 <BookOpen className="w-6 h-6 text-indigo-600" />
                 <span>Plataforma de <span className="text-indigo-600">Estudos</span></span>
              </div>
              <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
                 <span className="hidden md:inline hover:text-indigo-600 cursor-pointer">Meus Cursos</span>
                 <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                    <span className="text-xs font-bold">US</span>
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
    </div>
  );
};

export default App;