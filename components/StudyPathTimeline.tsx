
import React from 'react';
import { StudyPlan } from '../types';
import { Calendar, CheckCircle2, Circle, Clock } from 'lucide-react';

const StudyPathTimeline: React.FC<{ plan: StudyPlan }> = ({ plan }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Seu Plano: {plan.goal}</h3>
          <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
             <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Meta: {new Date(plan.deadline).toLocaleDateString()}</span>
             <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {plan.dailyMinutes} min/dia</span>
          </div>
        </div>
        <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-wider">
          Adaptativo
        </div>
      </div>

      <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:h-full before:w-0.5 before:bg-slate-100">
        {plan.generatedSchedule.map((week, idx) => (
          <div key={idx} className="relative pl-12">
            <div className={`absolute left-2 top-0 w-4 h-4 rounded-full border-2 transform -translate-x-1/2 bg-white ${
              idx === 0 ? 'border-indigo-500 text-indigo-500' : 'border-slate-300 text-slate-300'
            }`}>
              {idx === 0 && <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20"></div>}
            </div>
            
            <div className={`p-4 rounded-xl border transition-all ${
              idx === 0 
                ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                : 'bg-white border-slate-100 opacity-80 hover:opacity-100'
            }`}>
              <div className="flex justify-between items-start mb-2">
                 <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Semana {week.weekNumber}</span>
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                   week.focusArea === 'Fixation' ? 'bg-amber-100 text-amber-700' : 
                   week.focusArea === 'Practice' ? 'bg-blue-100 text-blue-700' :
                   'bg-slate-100 text-slate-600'
                 }`}>
                   {week.focusArea}
                 </span>
              </div>
              <h4 className="font-bold text-slate-800 mb-2">{week.theme}</h4>
              <ul className="space-y-1">
                {week.topicsToStudy.map((topic, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0"></span>
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudyPathTimeline;
