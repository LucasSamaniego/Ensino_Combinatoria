
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserProgress, Interaction, SkillState } from '../types';
import { ShieldCheck, UserCheck, Book, Save, Loader2, Search, UserPlus, CloudLightning, TrendingUp, Calendar, Clock, CheckCircle2, XCircle, AlertTriangle, BarChart2 } from 'lucide-react';
import { loadUserProgress, saveUserProgress, getEmptyProgress, findUserIdByEmail, savePendingPermission } from '../services/storageService';
import { getDifficultyForMastery } from '../services/tracingService';

const AdminDashboard: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { user } = useAuth();
  const [targetInput, setTargetInput] = useState('');
  const [targetUserProgress, setTargetUserProgress] = useState<UserProgress | null>(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [targetUserEmail, setTargetUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [isPendingMode, setIsPendingMode] = useState(false);

  const handleSearch = async () => {
    if (!targetInput) return;
    setLoading(true);
    setMsg('');
    setTargetUserProgress(null);
    setTargetUserId('');
    setTargetUserEmail('');
    setIsPendingMode(false);

    let foundId = targetInput.trim();
    let isEmail = foundId.includes('@');

    if (isEmail) {
       const resolvedId = await findUserIdByEmail(foundId);
       if (resolvedId) {
         foundId = resolvedId;
         setMsg(`Usuário encontrado na base: ${resolvedId}`);
       } else {
         setMsg('Usuário não registrado no banco de dados.');
         setTargetUserId('PENDING_USER');
         setTargetUserEmail(targetInput.trim());
         setIsPendingMode(true);
         setTargetUserProgress({ ...getEmptyProgress(), email: targetInput.trim() });
         setLoading(false);
         return;
       }
    }

    try {
      const data = await loadUserProgress(foundId);
      setTargetUserProgress(data);
      setTargetUserId(foundId);
    } catch (e) {
      setMsg('Erro ao carregar dados do usuário.');
      setTargetUserProgress(getEmptyProgress());
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = (courseId: string) => {
    if (!targetUserProgress) return;
    const current = targetUserProgress.assignedCourses || [];
    const updated = current.includes(courseId)
      ? current.filter(id => id !== courseId)
      : [...current, courseId];
    
    setTargetUserProgress({ ...targetUserProgress, assignedCourses: updated });
  };

  const handleSave = async () => {
    if (!targetUserProgress || !targetUserId) return;
    setLoading(true);

    if (isPendingMode && targetUserId === 'PENDING_USER') {
       savePendingPermission(targetUserEmail, targetUserProgress.assignedCourses);
       setMsg(`Sucesso! Pré-autorização salva localmente para ${targetUserEmail}.`);
    } else {
       await saveUserProgress(targetUserId, targetUserProgress);
       setMsg('Permissões sincronizadas na nuvem com sucesso!');
    }
    
    setLoading(false);
  };

  // --- Helper Functions for Monitoring ---

  const calculatePlanProgress = (plan: any) => {
    const totalWeeks = plan.generatedSchedule.length;
    // Simple heuristic: current week based on date
    const daysPassed = Math.floor((Date.now() - plan.createdAt) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.min(Math.floor(daysPassed / 7) + 1, totalWeeks);
    const percent = Math.round((currentWeek / totalWeeks) * 100);
    return { currentWeek, totalWeeks, percent };
  };

  const getSkillStats = (skills: { [key: string]: SkillState }) => {
    let mastered = 0;
    let intermediate = 0;
    let beginner = 0;
    
    Object.values(skills).forEach(s => {
      if (!s.isParent) return; // Count only main topics
      if (s.masteryProbability > 0.8) mastered++;
      else if (s.masteryProbability > 0.4) intermediate++;
      else beginner++;
    });

    return { mastered, intermediate, beginner };
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
             <ShieldCheck className="w-8 h-8 text-emerald-400" />
             <div>
               <h1 className="text-xl font-bold">Painel Administrativo</h1>
               <p className="text-slate-400 text-xs">Gestão Global & Monitoramento Pedagógico</p>
             </div>
          </div>
          <button onClick={onExit} className="text-sm hover:underline text-slate-300">Sair</button>
        </div>

        <div className="p-8">
           <div className="flex gap-4 mb-8">
             <div className="flex-grow relative">
                <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <input 
                  type="text" 
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  placeholder="ID do Usuário ou E-MAIL"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
             </div>
             <button 
               onClick={handleSearch}
               disabled={loading || !targetInput}
               className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2"
             >
               {loading ? <Loader2 className="animate-spin" /> : 'Buscar Aluno'}
             </button>
           </div>

           {msg && <div className={`p-4 mb-6 rounded-lg text-sm font-bold flex items-center gap-2 ${msg.includes('Sucesso') || msg.includes('sucesso') || msg.includes('encontrado') ? 'bg-green-100 text-green-800' : isPendingMode ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
             {msg.includes('nuvem') && <CloudLightning className="w-4 h-4" />}
             {msg}
           </div>}

           {targetUserProgress && targetUserId && (
             <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
                
                {/* --- 1. USER HEADER --- */}
                <div className={`flex items-center justify-between px-6 py-4 border rounded-xl ${isPendingMode ? 'bg-amber-50 border-amber-200' : 'bg-white border-indigo-100 shadow-sm'}`}>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500 text-xl">
                        {targetUserProgress.email ? targetUserProgress.email[0].toUpperCase() : 'U'}
                     </div>
                     <div>
                        <div className="flex items-center gap-2 text-sm font-mono text-slate-500">
                           {isPendingMode ? (
                              <>
                                 <UserPlus className="w-4 h-4 text-amber-500" /> 
                                 <span className="font-bold text-amber-700">Pré-Cadastro</span>
                              </>
                           ) : (
                              <>ID: {targetUserId}</>
                           )}
                        </div>
                        {targetUserProgress.email && <div className="text-lg font-bold text-slate-800">{targetUserProgress.email}</div>}
                     </div>
                  </div>
                  {!isPendingMode && (
                    <div className="text-right text-xs text-slate-500">
                       <p>Entrou em: {targetUserProgress.history?.length > 0 ? new Date(targetUserProgress.history[0].timestamp).toLocaleDateString() : 'N/A'}</p>
                       <p>Total Questões: <span className="font-bold text-indigo-600">{targetUserProgress.history?.length || 0}</span></p>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   
                   {/* --- 2. PERMISSIONS COLUMN --- */}
                   <div className="lg:col-span-1 space-y-6">
                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                         <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-4">
                           <UserCheck className="w-5 h-5 text-indigo-500" />
                           Acessos Liberados
                         </h3>
                         <div className="space-y-3">
                            {['math', 'concursos'].map(courseId => {
                               const isActive = targetUserProgress.assignedCourses?.includes(courseId);
                               return (
                                 <div 
                                   key={courseId}
                                   onClick={() => toggleCourse(courseId)}
                                   className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                                     isActive ? 'border-emerald-500 bg-white shadow-sm' : 'border-slate-200 bg-slate-100 opacity-60'
                                   }`}
                                 >
                                   <span className="font-bold text-sm text-slate-700">
                                      {courseId === 'math' ? 'Matemática & Exatas' : 'Concursos & Direito'}
                                   </span>
                                   <div className={`w-10 h-5 rounded-full relative transition-colors ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isActive ? 'left-6' : 'left-1'}`}></div>
                                   </div>
                                 </div>
                               );
                            })}
                         </div>
                         <button 
                           onClick={handleSave}
                           disabled={loading}
                           className="w-full mt-6 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 text-sm shadow-md"
                         >
                           {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                           Salvar Alterações
                         </button>
                      </div>

                      {/* Summary Stats */}
                      {!isPendingMode && (
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                           <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wide">Nível de Habilidade</h3>
                           {(() => {
                              const stats = getSkillStats(targetUserProgress.skills);
                              return (
                                <div className="space-y-3">
                                   <div className="flex justify-between items-center text-sm">
                                      <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Dominados</span>
                                      <span className="font-bold">{stats.mastered}</span>
                                   </div>
                                   <div className="flex justify-between items-center text-sm">
                                      <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Em Progresso</span>
                                      <span className="font-bold">{stats.intermediate}</span>
                                   </div>
                                   <div className="flex justify-between items-center text-sm">
                                      <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300"></div> Iniciante</span>
                                      <span className="font-bold">{stats.beginner}</span>
                                   </div>
                                </div>
                              );
                           })()}
                        </div>
                      )}
                   </div>

                   {/* --- 3. MONITORING COLUMN --- */}
                   <div className="lg:col-span-2 space-y-6">
                      
                      {/* Active Plans */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                         <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
                            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                               <TrendingUp className="w-5 h-5" /> Planos de Estudo Ativos
                            </h3>
                            <span className="text-xs font-bold bg-indigo-200 text-indigo-800 px-2 py-1 rounded">
                               {targetUserProgress.studyPlans.length} Plano(s)
                            </span>
                         </div>
                         
                         {targetUserProgress.studyPlans.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                               O aluno ainda não criou nenhum plano de estudos.
                            </div>
                         ) : (
                            <div className="divide-y divide-slate-100">
                               {targetUserProgress.studyPlans.map(plan => {
                                  const { percent, currentWeek, totalWeeks } = calculatePlanProgress(plan);
                                  return (
                                    <div key={plan.id} className="p-6">
                                       <div className="flex justify-between items-start mb-3">
                                          <div>
                                             <h4 className="font-bold text-slate-800">{plan.title}</h4>
                                             <p className="text-xs text-slate-500 mt-1">{plan.goal}</p>
                                          </div>
                                          <div className="text-right">
                                             <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Prazo</div>
                                             <div className="flex items-center gap-1 text-sm font-medium text-slate-700">
                                                <Calendar className="w-3 h-3 text-red-400" />
                                                {new Date(plan.deadline).toLocaleDateString()}
                                             </div>
                                          </div>
                                       </div>
                                       
                                       <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
                                          <span>Semana {currentWeek} de {totalWeeks}</span>
                                          <span>{percent}% da Jornada</span>
                                       </div>
                                       <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                          <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                                       </div>
                                    </div>
                                  );
                               })}
                            </div>
                         )}
                      </div>

                      {/* Recent Activity Log */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                         <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                               <Clock className="w-5 h-5 text-slate-400" /> Últimas Atividades
                            </h3>
                         </div>
                         
                         {(!targetUserProgress.history || targetUserProgress.history.length === 0) ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                               Nenhuma atividade registrada recentemente.
                            </div>
                         ) : (
                            <div className="divide-y divide-slate-100">
                               {targetUserProgress.history.slice(-5).reverse().map(interaction => (
                                  <div key={interaction.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                     <div className="flex items-center gap-3">
                                        {interaction.isCorrect ? (
                                           <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        ) : (
                                           <XCircle className="w-5 h-5 text-red-400" />
                                        )}
                                        <div>
                                           <div className="text-sm font-bold text-slate-700">
                                              {/* Fallback topic name lookup could be improved here */}
                                              {interaction.subSkillId || interaction.topicId}
                                           </div>
                                           <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-2">
                                              <span>{interaction.difficulty}</span>
                                              <span>•</span>
                                              <span>{interaction.timeSpentSeconds.toFixed(0)}s</span>
                                           </div>
                                        </div>
                                     </div>
                                     <div className="text-xs text-slate-400 font-mono">
                                        {new Date(interaction.timestamp).toLocaleDateString()} {new Date(interaction.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                     </div>
                                  </div>
                               ))}
                            </div>
                         )}
                      </div>

                   </div>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
