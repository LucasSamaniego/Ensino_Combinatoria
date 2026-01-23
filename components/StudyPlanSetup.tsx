import React, { useState } from 'react';
import { StudyPlan, UserProgress, SkillState } from '../types';
import { generateStudyPath } from '../services/geminiService';
import { Calendar, Clock, Target, Loader2, ArrowRight } from 'lucide-react';

interface StudyPlanSetupProps {
  progress: UserProgress;
  onPlanCreated: (plan: StudyPlan) => void;
}

const StudyPlanSetup: React.FC<StudyPlanSetupProps> = ({ progress, onPlanCreated }) => {
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal || !deadline) return;

    setLoading(true);

    // Identificar fraquezas (skills com mastery < 0.4)
    const weaknesses = Object.values(progress.skills)
      .filter((s: SkillState) => s.masteryProbability < 0.4)
      .map((s: SkillState) => s.name);

    const schedule = await generateStudyPath(weaknesses, goal, deadline, dailyMinutes);

    const newPlan: StudyPlan = {
      goal,
      deadline,
      dailyMinutes,
      generatedSchedule: schedule,
      createdAt: Date.now()
    };

    onPlanCreated(newPlan);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Personalize sua Trilha</h2>
          <p className="text-slate-500">
            A IA vai criar um cronograma baseado nas suas lacunas do teste de nivelamento e no seu tempo disponível.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Qual seu objetivo principal?</label>
            <input 
              type="text" 
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="Ex: Passar na ESA, Melhorar notas escolares..."
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" /> Data da Prova / Meta
              </label>
              <input 
                type="date" 
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" /> Tempo Diário (minutos)
              </label>
              <input 
                type="number" 
                value={dailyMinutes}
                onChange={e => setDailyMinutes(parseInt(e.target.value))}
                min={15}
                max={300}
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" /> Analisando Perfil e Criando Cronograma...
              </>
            ) : (
              <>
                Gerar Plano de Estudos <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudyPlanSetup;