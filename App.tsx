
import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  ChevronRight, 
  Lock, 
  LogOut, 
  Video, 
  Gavel, 
  BookOpen, 
  Scale, 
  Binary, 
  Cpu, 
  Divide, 
  ShieldAlert,
  PlusCircle,
  FileText,
  CheckCircle2,
  Trash2,
  Mail,
  Sigma,
  Hash,
  Triangle,
  Box,
  Crosshair,
  Activity,
  Infinity,
  BookType, // Ícone para Português
  Feather // Ícone alternativo para Português
} from 'lucide-react';
import CombinatoricsModule from './components/CombinatoricsModule';
import OnlineClassroom from './components/OnlineClassroom';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import StudyPlanSetup from './components/StudyPlanSetup';
import StudyPathTimeline from './components/StudyPathTimeline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { loadUserProgress, saveUserProgress, getEmptyProgress, getPendingPermissions, clearPendingPermission } from './services/storageService';
import { UserProgress, StudyPlan } from './types';
import { api } from './services/api';

type ViewState = 'hub' | 'admin' | 'plan_setup' | 'subject_math' | 'subject_concursos' | 'subject_portuguese' | 'module_active' | 'online_classroom';
type Category = 'math' | 'concursos' | 'portuguese';

const MainApp: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>('hub');
  const [activeCategory, setActiveCategory] = useState<Category>('math');
  const [activeSubCategory, setActiveSubCategory] = useState<string | undefined>(undefined);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [weeklyStudyTopics, setWeeklyStudyTopics] = useState<string[]>([]);
  const [weeklyTheme, setWeeklyTheme] = useState<string>('');
  
  // Notification State
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);

  // Efeito para carregar progresso APENAS quando o usuário muda/loga.
  useEffect(() => {
    const init = async () => {
      if (user) {
        let progress = await loadUserProgress(user.uid);
        
        let hasChanges = false;

        // 1. AUTO-CORRECTION: Save email to progress if missing
        if (progress.email !== user.email) {
          progress = { ...progress, email: user.email };
          hasChanges = true;
        }

        // 2. CHECK PENDING PERMISSIONS (Admin Pre-Authorization)
        const pendingCourses = getPendingPermissions(user.email);
        if (pendingCourses) {
           const mergedCourses = Array.from(new Set([...progress.assignedCourses, ...pendingCourses]));
           progress = { ...progress, assignedCourses: mergedCourses };
           clearPendingPermission(user.email); 
           hasChanges = true;
        }

        // 3. WELCOME EMAIL TRIGGER (Novos Alunos)
        // Se welcomeEmailSent for falso e o histórico estiver vazio (usuário novo), envia email.
        if (progress.welcomeEmailSent === false && progress.history.length === 0) {
           const emailSent = await api.sendWelcomeEmail(user.email, user.name);
           if (emailSent) {
             progress = { ...progress, welcomeEmailSent: true };
             hasChanges = true;
             setShowWelcomeToast(true);
             // Remove o toast após 5 segundos
             setTimeout(() => setShowWelcomeToast(false), 5000);
           }
        }

        if (hasChanges) {
          await saveUserProgress(user.uid, progress);
        }

        setUserProgress(progress);
      }
    };
    init();
  }, [user]); 

  const handlePlanCreated = async (plan: StudyPlan) => {
    if (user && userProgress) {
      const updated = { 
        ...userProgress, 
        studyPlans: [...userProgress.studyPlans, plan], // Append new plan
        activePlanId: plan.id // Set as active
      };
      setUserProgress(updated);
      
      await saveUserProgress(user.uid, updated);
      setCurrentView(`subject_${activeCategory}` as ViewState); 
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (user && userProgress) {
      const updated = { ...userProgress, activePlanId: planId };
      setUserProgress(updated);
      await saveUserProgress(user.uid, updated);
    }
  };

  const handleDeletePlan = async (planId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Impede a seleção do plano ao clicar na lixeira
    if (!user || !userProgress) return;

    if (window.confirm("Tem certeza que deseja excluir este plano de estudos? Esta ação não pode ser desfeita.")) {
      const updatedPlans = userProgress.studyPlans.filter(p => p.id !== planId);
      
      // Se o plano deletado era o ativo, reseta o activePlanId
      const isActive = userProgress.activePlanId === planId;
      
      const updatedProgress = {
        ...userProgress,
        studyPlans: updatedPlans,
        activePlanId: isActive ? undefined : userProgress.activePlanId
      };

      setUserProgress(updatedProgress);
      await saveUserProgress(user.uid, updatedProgress);
    }
  };

  const handleProgressUpdate = async (newProgress: UserProgress) => {
    // Ensure email is always preserved/updated
    const progressWithEmail = { 
      ...newProgress, 
      email: user?.email || newProgress.email 
    };
    
    setUserProgress(progressWithEmail);
    if (user) {
      await saveUserProgress(user.uid, progressWithEmail);
    }
  };

  // Handler para iniciar o estudo da semana a partir da Timeline
  const handleStartWeek = (topics: string[], theme: string) => {
    setWeeklyStudyTopics(topics);
    setWeeklyTheme(theme);
    // Navega para o módulo ativo, mas com uma "subcategoria" especial
    enterModule(activeCategory, 'weekly'); 
  };

  // Função auxiliar para atualizar o progresso local ao voltar de telas que modificam dados (como Admin)
  const refreshProgress = async () => {
    if (user) {
      const fresh = await loadUserProgress(user.uid);
      setUserProgress(fresh);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-mono text-sm uppercase tracking-widest text-slate-400">Loading System...</div>;
  if (!user) return <LoginScreen />;

  const firstName = user?.name ? user.name.split(' ')[0] : 'Estudante';
  
  const isAdmin = user.email.includes('admin') || 
                  user.email === 'admin@plataforma.com' || 
                  user.email === 'samaniego444@gmail.com' || 
                  user.email === 'convidado@plataforma.com';

  const activePlan = userProgress?.studyPlans.find(p => p.id === userProgress.activePlanId);

  const enterModule = async (cat: Category, sub?: string) => {
    if (!user) return;

    // Access is now unrestricted. No permission check.
    
    setActiveCategory(cat);
    setActiveSubCategory(sub);

    // 3. Se for módulo de conteúdo (não dashboard geral), entra direto
    if (sub) {
      setCurrentView('module_active');
    } else {
      setCurrentView(`subject_${cat}` as ViewState);
    }
  };

  const renderHub = () => (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-in fade-in duration-700 relative">
      
      {/* Toast Notification for Welcome Email */}
      {showWelcomeToast && (
        <div className="fixed top-24 right-4 z-50 bg-indigo-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right duration-500 max-w-sm border border-indigo-700">
           <div className="bg-indigo-700 p-2 rounded-lg">
              <Mail className="w-6 h-6 text-indigo-200" />
           </div>
           <div>
              <h4 className="font-bold text-sm">Bem-vindo a bordo!</h4>
              <p className="text-xs text-indigo-300 mt-1">Enviamos um email explicando como a plataforma funciona.</p>
           </div>
           <button onClick={() => setShowWelcomeToast(false)} className="text-indigo-400 hover:text-white"><CheckCircle2 className="w-5 h-5" /></button>
        </div>
      )}

      {isAdmin && (
        <div className="absolute top-4 right-4">
          <button 
            onClick={() => setCurrentView('admin')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-700 transition-colors"
          >
            <ShieldAlert className="w-4 h-4" /> Admin Dashboard
          </button>
        </div>
      )}

      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tighter uppercase">Plataforma de Estudos</h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Olá, <span className="text-indigo-600 font-bold">{firstName}</span>. 
          {activePlan
            ? ` Seguindo plano ativo: ${activePlan.title}` 
            : ' Selecione sua trilha para começar.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Matemática */}
        <button 
          onClick={() => enterModule('math')}
          className="group relative bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-2xl hover:border-indigo-200 transition-all duration-500 text-left overflow-hidden"
        >
          <div className="absolute -top-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <Calculator className="w-40 h-40 text-indigo-600" />
          </div>
          <div className="relative z-10">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-indigo-600 shadow-inner">
              <Calculator className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Matemática</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
               Acesso Completo
            </p>
            <span className="inline-flex items-center text-xs font-black uppercase tracking-widest text-indigo-600">
              Acessar Conteúdo <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </button>

        {/* Português (NOVO) */}
        <button 
          onClick={() => enterModule('portuguese')}
          className="group relative bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-2xl hover:border-rose-200 transition-all duration-500 text-left overflow-hidden"
        >
          <div className="absolute -top-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <BookType className="w-40 h-40 text-rose-600" />
          </div>
          <div className="relative z-10">
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-rose-600 shadow-inner">
              <BookType className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Português</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
               Acesso Completo
            </p>
            <span className="inline-flex items-center text-xs font-black uppercase tracking-widest text-rose-600">
              Acessar Conteúdo <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </button>

        {/* Concursos Públicos */}
        <button 
          onClick={() => enterModule('concursos')}
          className="group relative bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-2xl hover:border-emerald-200 transition-all duration-500 text-left overflow-hidden"
        >
          <div className="absolute -top-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <Gavel className="w-40 h-40 text-emerald-600" />
          </div>
          <div className="relative z-10">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-emerald-600 shadow-inner">
              <Gavel className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Concursos Públicos</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
               Acesso Completo
            </p>
            <span className="inline-flex items-center text-xs font-black uppercase tracking-widest text-emerald-600">
              Acessar Conteúdo <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </button>

        {/* TI e Engenharia (Em breve) */}
        <div className="group relative bg-slate-100 p-8 rounded-3xl border border-slate-200 text-left opacity-60">
           <div className="absolute top-6 right-6 text-slate-400">
             <Lock className="w-5 h-5" />
           </div>
           <div className="w-14 h-14 bg-slate-200 rounded-2xl flex items-center justify-center mb-6 text-slate-400">
              <Cpu className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-slate-400 mb-2">Engenharia & TI</h3>
            <p className="text-slate-400 text-sm mb-8">Estrutura de Dados, Redes e Física Avançada.</p>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Breve</span>
        </div>
      </div>

      <div className="mt-20 flex justify-center border-t border-slate-200 pt-8">
        <button 
          onClick={signOut}
          className="flex items-center gap-2 px-6 py-2 text-slate-400 hover:text-red-600 transition-colors font-bold text-xs uppercase tracking-widest"
        >
          <LogOut className="w-4 h-4" /> Sair da conta
        </button>
      </div>
    </div>
  );

  const renderSubjectDetail = (cat: Category) => {
    const isMath = cat === 'math';
    const isPortuguese = cat === 'portuguese';
    
    let color = 'indigo';
    let Icon = Calculator;
    let title = 'Matemática';

    if (isPortuguese) {
      color = 'rose';
      Icon = BookType;
      title = 'Português';
    } else if (cat === 'concursos') {
      color = 'emerald';
      Icon = Scale;
      title = 'Carreiras Públicas';
    }

    // Filter plans for this category
    const categoryPlans = userProgress?.studyPlans.filter(p => p.category === cat) || [];
    
    // Check if current active plan is in this category
    const activePlanInThisCategory = activePlan && activePlan.category === cat ? activePlan : null;

    const generalMathModules = [
      { id: 'arithmetic', name: 'Aritmética', desc: 'Teoria dos Números', icon: Hash, color: 'emerald' },
      { id: 'algebra', name: 'Álgebra', desc: 'Funções & Equações', icon: Sigma, color: 'blue' },
      { id: 'geometry_flat', name: 'Geometria Plana', desc: 'Áreas & Formas', icon: Triangle, color: 'orange' },
      { id: 'geometry_spatial', name: 'Geometria Espacial', desc: 'Sólidos & Volumes', icon: Box, color: 'orange' },
      { id: 'geometry_analytic', name: 'Geometria Analítica', desc: 'Coordenadas & Cônicas', icon: Crosshair, color: 'orange' },
      { id: 'trigonometry', name: 'Trigonometria', desc: 'Seno, Cosseno & Ciclo', icon: Activity, color: 'purple' },
      { id: 'calculus_1', name: 'Cálculo I', desc: 'Limites & Derivadas', icon: Infinity, color: 'rose' },
      { id: 'calculus_2', name: 'Cálculo II', desc: 'Integrais & Séries', icon: Infinity, color: 'rose' },
      { id: 'calculus_3', name: 'Cálculo III', desc: 'Multivariável', icon: Infinity, color: 'rose' },
    ];

    return (
      <div className="max-w-6xl mx-auto px-4 py-12 animate-in slide-in-from-bottom-4 duration-500">
        <button 
          onClick={() => setCurrentView('hub')}
          className="mb-8 flex items-center text-slate-400 hover:text-slate-900 transition-colors font-bold text-xs uppercase tracking-widest"
        >
          <ChevronRight className="w-4 h-4 rotate-180 mr-1" /> Voltar ao Hub
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <div className={`w-20 h-20 bg-${color}-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-${color}-200`}>
               <Icon className="w-10 h-10" />
            </div>
            <div>
               <h1 className="text-4xl font-black text-slate-900 tracking-tight">{title}</h1>
               <p className="text-slate-500 font-medium">Gerencie seus editais e trilhas de aprendizagem.</p>
            </div>
          </div>
          
          <button 
            onClick={() => setCurrentView('online_classroom')}
            className={`flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-xl shadow-slate-200`}
          >
            <Video className="w-5 h-5 text-red-500" /> ESTÚDIO AO VIVO
          </button>
        </div>

        {/* --- PLAN MANAGEMENT SECTION --- */}
        <div className="mb-12">
          <div className="flex justify-between items-end mb-4">
             <h3 className="text-lg font-bold text-slate-800">Seus Planos de Estudo</h3>
             <button 
               onClick={() => setCurrentView('plan_setup')} 
               className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-colors bg-${color}-50 text-${color}-700 hover:bg-${color}-100`}
             >
               <PlusCircle className="w-4 h-4" /> Novo Plano
             </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4">
             {categoryPlans.length === 0 && (
                <div 
                  onClick={() => setCurrentView('plan_setup')}
                  className="flex-shrink-0 w-64 h-32 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all"
                >
                   <PlusCircle className="w-8 h-8 mb-2 opacity-50" />
                   <span className="text-sm font-bold">Criar Primeiro Plano</span>
                </div>
             )}

             {categoryPlans.map(plan => {
               const isActive = userProgress?.activePlanId === plan.id;
               return (
                 <div 
                   key={plan.id}
                   onClick={() => handleSelectPlan(plan.id)}
                   className={`flex-shrink-0 w-72 p-5 rounded-2xl border-2 cursor-pointer transition-all relative group ${
                     isActive 
                       ? `bg-${color}-600 border-${color}-600 text-white shadow-xl transform scale-[1.02]` 
                       : 'bg-white border-slate-200 hover:border-slate-300'
                   }`}
                 >
                    {isActive && <div className="absolute -top-3 -right-3 bg-white text-slate-900 rounded-full p-1 shadow-md border"><CheckCircle2 className="w-5 h-5 text-green-500" /></div>}
                    
                    {/* Botão de Excluir (Lixeira) */}
                    <button 
                      onClick={(e) => handleDeletePlan(plan.id, e)}
                      className={`absolute top-3 right-3 p-1.5 rounded-full transition-colors z-10 ${
                        isActive 
                          ? 'text-white/60 hover:text-white hover:bg-white/20' 
                          : 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                      }`}
                      title="Excluir Plano"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2 mb-2">
                       <FileText className={`w-4 h-4 ${isActive ? 'text-white/70' : 'text-slate-400'}`} />
                       <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                         {new Date(plan.createdAt).toLocaleDateString()}
                       </span>
                    </div>
                    <h4 className={`font-bold text-lg leading-tight mb-4 pr-6 ${isActive ? 'text-white' : 'text-slate-800'}`}>{plan.title}</h4>
                    <div className={`text-xs ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                       Meta: {new Date(plan.deadline).toLocaleDateString()}
                    </div>
                 </div>
               )
             })}
          </div>
        </div>

        {/* Display Active Plan Timeline */}
        {activePlanInThisCategory ? (
          <StudyPathTimeline 
            plan={activePlanInThisCategory} 
            skills={userProgress?.skills || {}}
            onStartWeek={handleStartWeek} 
          />
        ) : (
          categoryPlans.length > 0 && (
            <div className="bg-slate-100 p-8 rounded-2xl text-center text-slate-500 mb-8">
               Selecione um plano acima para visualizar a linha do tempo.
            </div>
          )
        )}

        {/* Warning if Placement not done */}
        {!userProgress?.hasCompletedPlacement && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-8 flex items-center justify-between">
            <div className="text-amber-800 text-sm">
              <span className="font-bold">Atenção:</span> Complete o Módulo de Nivelamento (Matemática Básica) para liberar seu Plano de Estudos personalizado.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isMath && (
            <>
              {/* Matemática Básica */}
              <button 
                onClick={() => enterModule('math', 'basic')}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-sky-500 hover:ring-2 hover:ring-sky-200 transition-all text-left shadow-sm hover:shadow-md"
              >
                 <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center mb-4">
                    <Divide className="w-5 h-5" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 mb-2">Matemática Básica</h3>
                 <p className="text-sm text-slate-600 mb-6">Tabuada, operações fundamentais e cálculo mental.</p>
                 <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-sky-600">
                   Entrar no Módulo <ChevronRight className="w-3 h-3 ml-1" />
                 </div>
              </button>

              {/* Análise Combinatória */}
              <button 
                onClick={() => enterModule('math', 'combinatorics')}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:ring-2 hover:ring-indigo-200 transition-all text-left shadow-sm hover:shadow-md"
              >
                 <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
                    <Binary className="w-5 h-5" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 mb-2">Análise Combinatória</h3>
                 <p className="text-sm text-slate-600 mb-6">Trilha adaptativa baseada no livro do Morgado.</p>
                 <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-indigo-600">
                   Entrar no Módulo <ChevronRight className="w-3 h-3 ml-1" />
                 </div>
              </button>

              {/* Novos Módulos Individuais */}
              {generalMathModules.map((mod) => (
                <button 
                  key={mod.id}
                  onClick={() => enterModule('math', mod.id)}
                  className={`bg-white p-6 rounded-2xl border border-slate-200 hover:border-${mod.color}-500 hover:ring-2 hover:ring-${mod.color}-200 transition-all text-left shadow-sm hover:shadow-md`}
                >
                   <div className={`w-10 h-10 bg-${mod.color}-100 text-${mod.color}-600 rounded-lg flex items-center justify-center mb-4`}>
                      <mod.icon className="w-5 h-5" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-900 mb-2">{mod.name}</h3>
                   <p className="text-sm text-slate-600 mb-6">{mod.desc}</p>
                   <div className={`flex items-center text-[10px] font-black uppercase tracking-widest text-${mod.color}-600`}>
                     Entrar no Módulo <ChevronRight className="w-3 h-3 ml-1" />
                   </div>
                </button>
              ))}
            </>
          )}

          {isPortuguese && (
             <button 
                onClick={() => enterModule('portuguese', 'portuguese')}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-rose-500 hover:ring-2 hover:ring-rose-200 transition-all text-left shadow-sm hover:shadow-md col-span-full md:col-span-2 lg:col-span-3"
              >
                 <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center mb-4">
                    <Feather className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 mb-2">Língua Portuguesa Completa</h3>
                 <p className="text-sm text-slate-600 mb-6">Módulos de Gramática, Interpretação de Texto, Literatura e Redação.</p>
                 <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-rose-600">
                   Acessar Módulos <ChevronRight className="w-3 h-3 ml-1" />
                 </div>
              </button>
          )}

          {!isMath && !isPortuguese && (
            <>
              {/* Card de Direito e RL (Concursos) */}
              <button 
                onClick={() => enterModule('concursos', 'concursos')}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-200 transition-all text-left shadow-sm hover:shadow-md"
              >
                 <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
                    <Scale className="w-5 h-5" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 mb-2">Jurídico e Lógica</h3>
                 <p className="text-sm text-slate-600 mb-6">Direito Administrativo, Penal e Raciocínio Lógico.</p>
                 <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-emerald-600">
                   Entrar no Módulo <ChevronRight className="w-3 h-3 ml-1" />
                 </div>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      {currentView === 'hub' && renderHub()}
      {currentView === 'admin' && (
        <AdminDashboard 
          onExit={() => { 
            refreshProgress(); 
            setCurrentView('hub'); 
          }} 
        />
      )}
      {/* Passando activeCategory para StudyPlanSetup */}
      {currentView === 'plan_setup' && userProgress && (
        <StudyPlanSetup 
          progress={userProgress} 
          onPlanCreated={handlePlanCreated} 
          category={activeCategory} 
        />
      )}
      {currentView === 'subject_math' && renderSubjectDetail('math')}
      {currentView === 'subject_concursos' && renderSubjectDetail('concursos')}
      {currentView === 'subject_portuguese' && renderSubjectDetail('portuguese')}
      {currentView === 'module_active' && userProgress && (
        <CombinatoricsModule 
          category={activeCategory} 
          subCategory={activeSubCategory}
          weeklyTopics={weeklyStudyTopics}
          weeklyTheme={weeklyTheme}
          initialProgress={userProgress} 
          onUpdateProgress={handleProgressUpdate}
          onExit={() => enterModule(activeCategory)} 
        />
      )}
      {currentView === 'online_classroom' && (
        <OnlineClassroom onExit={() => setCurrentView(`subject_${activeCategory}` as ViewState)} />
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
