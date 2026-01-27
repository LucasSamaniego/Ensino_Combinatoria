
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserProgress } from '../types';
import { ShieldCheck, UserCheck, Book, Save, Loader2, Search, UserPlus, CloudLightning } from 'lucide-react';
import { loadUserProgress, saveUserProgress, getEmptyProgress, findUserIdByEmail, savePendingPermission } from '../services/storageService';

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

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
             <ShieldCheck className="w-8 h-8 text-emerald-400" />
             <div>
               <h1 className="text-xl font-bold">Painel Administrativo</h1>
               <p className="text-slate-400 text-xs">Gestão Global de Acesso (Cloud Sync)</p>
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
               {loading ? <Loader2 className="animate-spin" /> : 'Buscar'}
             </button>
           </div>

           {msg && <div className={`p-4 mb-6 rounded-lg text-sm font-bold flex items-center gap-2 ${msg.includes('Sucesso') || msg.includes('sucesso') || msg.includes('encontrado') ? 'bg-green-100 text-green-800' : isPendingMode ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
             {msg.includes('nuvem') && <CloudLightning className="w-4 h-4" />}
             {msg}
           </div>}

           {targetUserProgress && targetUserId && (
             <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
                <div className={`flex items-center justify-between px-4 py-3 border rounded-lg ${isPendingMode ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 text-sm font-mono text-slate-600">
                     {isPendingMode ? (
                        <>
                           <UserPlus className="w-5 h-5 text-amber-500" /> 
                           <span className="font-bold text-amber-700">Modo Pré-Autorização</span>
                        </>
                     ) : (
                        <><span>ID: {targetUserId}</span></>
                     )}
                  </div>
                  {targetUserProgress.email && <span className="text-sm font-bold text-slate-700">{targetUserProgress.email}</span>}
                </div>
                
                {isPendingMode && (
                   <p className="text-sm text-slate-500">
                      Este usuário ainda não entrou na plataforma. As permissões serão aplicadas no primeiro login.
                   </p>
                )}

                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                   <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-4">
                     <UserCheck className="w-5 h-5 text-indigo-500" />
                     Permissões de Curso
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {['math', 'concursos'].map(courseId => {
                         const isActive = targetUserProgress.assignedCourses?.includes(courseId);
                         return (
                           <div 
                             key={courseId}
                             onClick={() => toggleCourse(courseId)}
                             className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between ${
                               isActive ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                             }`}
                           >
                             <div className="flex items-center gap-3">
                                <div className={`p-2 rounded ${isActive ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                                   <Book className="w-5 h-5" />
                                </div>
                                <div>
                                  <span className="font-bold uppercase text-sm block text-slate-800">
                                    {courseId === 'math' ? 'Matemática & Exatas' : 'Concursos & Direito'}
                                  </span>
                                  <span className={`text-xs font-bold uppercase tracking-wide ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {isActive ? '● Acesso Liberado' : '○ Bloqueado'}
                                  </span>
                                </div>
                             </div>
                             <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isActive ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>
                               {isActive && <div className="w-2 h-2 bg-white rounded-full"></div>}
                             </div>
                           </div>
                         );
                      })}
                   </div>
                </div>

                <div className="flex justify-end">
                   <button 
                     onClick={handleSave}
                     disabled={loading}
                     className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2 shadow-lg"
                   >
                     {loading ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />}
                     {isPendingMode ? 'Salvar Pré-Autorização' : 'Sincronizar na Nuvem'}
                   </button>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
