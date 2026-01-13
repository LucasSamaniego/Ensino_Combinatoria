import React from 'react';
import { SimulationConfig, Difficulty } from '../types';
import { GraduationCap, Briefcase, Award, Crosshair } from 'lucide-react';

interface SimulationHubProps {
  onSelect: (config: SimulationConfig) => void;
}

const SimulationHub: React.FC<SimulationHubProps> = ({ onSelect }) => {
  
  const simulations: SimulationConfig[] = [
    {
      id: 'sim_school',
      title: 'Fixação Escolar',
      description: 'Questões diretas para consolidar conceitos básicos e intermediários.',
      style: 'School',
      questionCount: 5,
      difficulty: Difficulty.BASIC
    },
    {
      id: 'sim_concurso',
      title: 'Concursos Públicos',
      description: 'Foco em bancas como FGV e Cesgranrio. Situações-problema e lógica.',
      style: 'Concurso',
      questionCount: 5,
      difficulty: Difficulty.INTERMEDIATE
    },
    {
      id: 'sim_olympiad',
      title: 'Olimpíadas (OBMEP/OBM)',
      description: 'Desafios criativos que exigem raciocínio fora da caixa, não apenas fórmulas.',
      style: 'Olympiad',
      questionCount: 4,
      difficulty: Difficulty.ADVANCED
    },
    {
      id: 'sim_military',
      title: 'Elite: ITA / IME',
      description: 'O nível mais alto. Questões complexas do estilo militar e engenharia de ponta.',
      style: 'Military',
      questionCount: 3,
      difficulty: Difficulty.OLYMPIAD
    }
  ];

  const getIcon = (style: string) => {
    switch(style) {
      case 'School': return <GraduationCap className="w-8 h-8 text-green-600" />;
      case 'Concurso': return <Briefcase className="w-8 h-8 text-blue-600" />;
      case 'Olympiad': return <Award className="w-8 h-8 text-amber-600" />;
      case 'Military': return <Crosshair className="w-8 h-8 text-red-600" />;
      default: return <GraduationCap />;
    }
  };

  const getBgColor = (style: string) => {
    switch(style) {
      case 'School': return 'bg-green-50 border-green-200 hover:border-green-300';
      case 'Concurso': return 'bg-blue-50 border-blue-200 hover:border-blue-300';
      case 'Olympiad': return 'bg-amber-50 border-amber-200 hover:border-amber-300';
      case 'Military': return 'bg-red-50 border-red-200 hover:border-red-300';
      default: return 'bg-gray-50';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Simulados Específicos</h2>
        <p className="text-gray-500">
          Escolha um modo de prova para testar seus conhecimentos em cenários reais.
          Ao contrário da prática adaptativa, aqui você resolve uma bateria de questões e recebe a nota ao final.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {simulations.map((sim) => (
          <button
            key={sim.id}
            onClick={() => onSelect(sim)}
            className={`flex flex-col text-left p-6 rounded-2xl border-2 transition-all duration-200 transform hover:-translate-y-1 shadow-sm hover:shadow-md ${getBgColor(sim.style)}`}
          >
            <div className="flex justify-between items-start w-full mb-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                {getIcon(sim.style)}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-white px-2 py-1 rounded-md shadow-sm">
                {sim.questionCount} Questões
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 mb-2">{sim.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {sim.description}
            </p>
            
            <div className="mt-auto pt-4 w-full flex items-center text-sm font-bold text-gray-700 group">
              Iniciar Simulado <span className="ml-2 group-hover:translate-x-1 transition-transform">&rarr;</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SimulationHub;