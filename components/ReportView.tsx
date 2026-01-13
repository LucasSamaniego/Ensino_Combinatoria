import React, { useEffect, useState } from 'react';
import { Interaction, ReportData, GraphNode } from '../types';
import { generateFeedbackReport } from '../services/geminiService';
import { Loader2, User, GraduationCap, AlertTriangle, CheckCircle2, Network } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ReportViewProps {
  history: Interaction[];
  onBack: () => void;
}

const ReportView: React.FC<ReportViewProps> = ({ history, onBack }) => {
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const fetchReport = async () => {
    setLoading(true);
    const data = await generateFeedbackReport(history, role);
    setReport(data);
    setLoading(false);
  };

  const chartData = history.slice(-20).map((h, i) => ({
    attempt: i + 1,
    result: h.isCorrect ? 1 : 0,
    time: h.timeSpentSeconds
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mastered': return '#22c55e'; // green-500
      case 'progress': return '#3b82f6'; // blue-500
      case 'pending': return '#94a3b8'; // slate-400
      default: return '#94a3b8';
    }
  };

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">Relatório de Desempenho</h2>
           <p className="text-gray-500 text-sm">Análise baseada em Deep Knowledge Tracing (DKT)</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setRole('student')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              role === 'student' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'
            }`}
          >
            Aluno
          </button>
          <button
            onClick={() => setRole('teacher')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              role === 'teacher' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'
            }`}
          >
            Professor
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-gray-500">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
          <p className="mb-2 font-medium">Analisando padrão de aprendizagem...</p>
          <p className="text-sm">A IA está construindo seu Grafo de Conhecimento.</p>
        </div>
      ) : report ? (
        <div className="space-y-8">
          
          {/* Grafo de Conhecimento Section */}
          {report.knowledgeGraph && report.knowledgeGraph.nodes.length > 0 && (
            <div className="bg-slate-900 rounded-xl p-6 shadow-inner overflow-hidden relative">
              <div className="flex justify-between items-center mb-4 text-slate-300">
                <h3 className="flex items-center gap-2 font-bold text-white">
                   <Network className="w-5 h-5 text-indigo-400" /> Grafo de Aprendizagem
                </h3>
                <div className="flex gap-4 text-xs">
                   <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Dominado</span>
                   <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Em Progresso</span>
                   <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-400"></div> Futuro</span>
                </div>
              </div>
              
              <div className="w-full h-64 md:h-80 bg-slate-800/50 rounded-lg relative border border-slate-700">
                 <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-full">
                    {/* Edges */}
                    {report.knowledgeGraph.edges.map((edge, i) => {
                       const fromNode = report.knowledgeGraph.nodes.find(n => n.id === edge.from);
                       const toNode = report.knowledgeGraph.nodes.find(n => n.id === edge.to);
                       if (!fromNode || !toNode) return null;
                       return (
                         <line 
                           key={i}
                           x1={fromNode.x} 
                           y1={fromNode.y} 
                           x2={toNode.x} 
                           y2={toNode.y} 
                           stroke="#475569" 
                           strokeWidth="0.5"
                           strokeDasharray={toNode.status === 'pending' ? "2" : "0"}
                         />
                       );
                    })}
                    
                    {/* Nodes */}
                    {report.knowledgeGraph.nodes.map((node: GraphNode) => (
                      <g key={node.id} className="cursor-default">
                        <circle 
                          cx={node.x} 
                          cy={node.y} 
                          r="4" 
                          fill={getStatusColor(node.status)} 
                          stroke="#1e293b" 
                          strokeWidth="1"
                          className="transition-all hover:r-5"
                        />
                        <text 
                          x={node.x} 
                          y={node.y + 7} 
                          fill="#e2e8f0" 
                          fontSize="3" 
                          textAnchor="middle" 
                          className="font-sans pointer-events-none select-none"
                        >
                          {node.label}
                        </text>
                      </g>
                    ))}
                 </svg>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                 Visualização gerada pela IA representando a topologia do seu conhecimento atual.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Analysis Column */}
            <div className="space-y-6">
              <div className={`p-6 rounded-xl border ${role === 'student' ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-3 text-indigo-900 font-bold">
                  {role === 'student' ? <User className="w-5 h-5"/> : <GraduationCap className="w-5 h-5"/>}
                  Resumo {role === 'teacher' ? 'Pedagógico' : 'Pessoal'}
                </div>
                <p className="text-gray-700 leading-relaxed text-sm">
                  {report.summary}
                </p>
              </div>

              <div>
                 <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-green-500"/> Pontos Fortes
                 </h3>
                 <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                   {report.strengths.map((s, i) => <li key={i}>{s}</li>)}
                 </ul>
              </div>

              <div>
                 <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                   <AlertTriangle className="w-4 h-4 text-amber-500"/> Pontos de Atenção
                 </h3>
                 <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                   {report.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                 </ul>
              </div>
              
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-xs font-bold uppercase text-amber-600">Recomendação DKT</span>
                <p className="text-gray-800 font-medium mt-1">{report.recommendedFocus}</p>
              </div>
            </div>

            {/* Charts Column */}
            <div className="space-y-6">
              <div className="h-64 bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 text-center">Histórico Recente (Acurácia)</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                     <XAxis dataKey="attempt" hide/>
                     <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ display: 'none' }}
                     />
                     <Bar dataKey="result" radius={[4, 4, 0, 0]}>
                       {chartData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.result === 1 ? '#22c55e' : '#ef4444'} />
                       ))}
                     </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-100 p-6 rounded-xl text-xs text-slate-500 space-y-2">
                <h4 className="font-bold text-slate-700 uppercase">Como funciona o DKT?</h4>
                <p>
                  O Deep Knowledge Tracing utiliza redes neurais (simuladas aqui pela IA) para entender a dependência temporal das suas respostas.
                </p>
                <p>
                  Diferente de médias simples, ele entende que errar uma questão difícil depois de acertar várias fáceis é normal, mas errar conceitos básicos indica uma lacuna fundamental.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-12">
           <div className="mb-4 text-6xl">📊</div>
           <p className="font-medium">Sem dados suficientes.</p>
           <p className="text-sm mt-2">Realize alguns exercícios para gerar seu primeiro relatório.</p>
        </div>
      )}

      <button onClick={onBack} className="mt-8 text-indigo-600 hover:underline text-sm font-medium flex items-center gap-1">
        &larr; Voltar ao Painel
      </button>
    </div>
  );
};

export default ReportView;