import React, { useState } from 'react';
import { SkillState, TopicId, SubSkill } from '../types';
import { getDifficultyForMastery } from '../services/tracingService';
import { Trophy, TrendingUp, BookOpen, BrainCircuit, ChevronDown, ChevronUp } from 'lucide-react';

interface SkillCardProps {
  topic: { id: TopicId; name: string; description: string; subSkills: SubSkill[] };
  parentStats: SkillState;
  allSkills: { [key: string]: SkillState };
  onClick: (id: TopicId) => void;
}

const SkillCard: React.FC<SkillCardProps> = ({ topic, parentStats, allSkills, onClick }) => {
  const [expanded, setExpanded] = useState(false);
  
  const difficulty = getDifficultyForMastery(parentStats.masteryProbability);
  const percent = Math.round(parentStats.masteryProbability * 100);

  const getColor = (diff: string) => {
    switch (diff) {
      case 'Basic': return 'bg-green-100 text-green-800 border-green-200';
      case 'Intermediate': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Advanced': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Olympiad': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100';
    }
  };

  const getDifficultyLabel = (diff: string) => {
    switch (diff) {
      case 'Basic': return 'Básico';
      case 'Intermediate': return 'Intermediário';
      case 'Advanced': return 'Avançado';
      case 'Olympiad': return 'Olímpico';
      default: return diff;
    }
  };

  const getIcon = (diff: string) => {
    switch (diff) {
      case 'Basic': return <BookOpen className="w-5 h-5" />;
      case 'Intermediate': return <TrendingUp className="w-5 h-5" />;
      case 'Advanced': return <BrainCircuit className="w-5 h-5" />;
      case 'Olympiad': return <Trophy className="w-5 h-5" />;
      default: return <BookOpen className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 overflow-hidden">
      {/* Main Card Header */}
      <div className="p-6 cursor-pointer" onClick={() => onClick(topic.id)}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg text-gray-900 hover:text-indigo-600 transition-colors">
              {topic.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{topic.description}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${getColor(difficulty)}`}>
            {getIcon(difficulty)}
            {getDifficultyLabel(difficulty)}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Proficiência Geral (BKT)</span>
            <span>{percent}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-indigo-600 transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Expand/Collapse Trigger */}
      <button 
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="w-full py-2 bg-gray-50 border-t border-gray-100 text-xs font-medium text-gray-500 hover:text-indigo-600 flex items-center justify-center gap-1 transition-colors"
      >
        {expanded ? (
          <>Ocultar Habilidades <ChevronUp className="w-3 h-3"/></>
        ) : (
          <>Ver Habilidades Detalhadas <ChevronDown className="w-3 h-3"/></>
        )}
      </button>

      {/* Detailed Sub-Skills */}
      {expanded && (
        <div className="bg-gray-50 px-6 py-4 space-y-4 border-t border-gray-200 animate-in slide-in-from-top-2 duration-200">
          <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">Habilidades Necessárias</h4>
          {topic.subSkills.map(subSkill => {
            const stats = allSkills[subSkill.id];
            const subPercent = stats ? Math.round(stats.masteryProbability * 100) : 10;
            const subDiff = stats ? getDifficultyForMastery(stats.masteryProbability) : 'Basic';
            
            return (
              <div key={subSkill.id} className="flex flex-col gap-1">
                <div className="flex justify-between text-sm text-gray-700">
                  <span>{subSkill.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${getColor(subDiff)} bg-opacity-50`}>
                    {getDifficultyLabel(subDiff)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${subPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SkillCard;