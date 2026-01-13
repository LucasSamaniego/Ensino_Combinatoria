
import React, { useState } from 'react';
import { Play, RotateCcw, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ProbabilityLab: React.FC = () => {
  const [rolls, setRolls] = useState<number[]>([]);
  const [totalSims, setTotalSims] = useState(0);

  const rollDice = (times: number) => {
    const newRolls = [...rolls];
    for (let i = 0; i < times; i++) {
      newRolls.push(Math.floor(Math.random() * 6) + 1);
    }
    setRolls(newRolls);
    setTotalSims(prev => prev + times);
  };

  const reset = () => {
    setRolls([]);
    setTotalSims(0);
  };

  const getStats = () => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    rolls.forEach(r => counts[r]++);
    return Object.entries(counts).map(([face, count]) => ({
      face: `Face ${face}`,
      count,
      percent: totalSims > 0 ? ((count / totalSims) * 100).toFixed(1) : 0
    }));
  };

  const stats = getStats();

  return (
    <div className="flex-grow p-8 flex flex-col items-center bg-slate-900 overflow-y-auto">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white mb-2">Simulador da Lei dos Grandes Números</h3>
          <p className="text-slate-400">Observe como a frequência relativa se aproxima da teórica (16.6%) conforme aumentamos as repetições.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 text-center">
             <div className="text-4xl font-bold text-white mb-1">{totalSims}</div>
             <div className="text-xs uppercase font-bold text-slate-500">Total de Lançamentos</div>
          </div>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col justify-center gap-2">
             <button onClick={() => rollDice(1)} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> Lançar 1 Vez
             </button>
             <button onClick={() => rollDice(100)} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold">
                Lançar 100 Vezes
             </button>
          </div>
          <button onClick={reset} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors">
             <RotateCcw className="w-6 h-6" />
             <span className="text-xs font-bold uppercase">Resetar Dados</span>
          </button>
        </div>

        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 h-80">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={stats}>
               <XAxis dataKey="face" stroke="#94a3b8" />
               <YAxis stroke="#94a3b8" />
               <Tooltip 
                 contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                 itemStyle={{ color: '#fff' }}
               />
               <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]}>
                 {stats.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#4f46e5'} />
                 ))}
               </Bar>
             </BarChart>
           </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
           {stats.map(s => (
             <div key={s.face} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 text-center">
                <div className="text-indigo-400 font-bold text-lg">{s.percent}%</div>
                <div className="text-[10px] uppercase font-bold text-slate-500">{s.face}</div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default ProbabilityLab;
