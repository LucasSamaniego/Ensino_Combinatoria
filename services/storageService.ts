
import { UserProgress, TopicId, SkillState, StudyPlan } from '../types';
import { TOPICS_DATA, DEFAULT_BKT_PARAMS } from '../constants';
import { api } from './api';
import { db } from './firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

const STORAGE_PREFIX = 'plataforma_estudos_v1_';
const PENDING_PERMS_KEY = 'plataforma_pending_permissions';

// Cria estado inicial vazio (Executado no Client)
export const getEmptyProgress = (): UserProgress => {
  const skills: { [key: string]: SkillState } = {};
    
  TOPICS_DATA.forEach(t => {
    skills[t.id] = {
      id: t.id,
      name: t.name,
      isParent: true,
      masteryProbability: DEFAULT_BKT_PARAMS.p_init,
      totalAttempts: 0,
      correctStreak: 0,
      averageResponseTime: 0,
      subSkillIds: t.subSkills.map(s => s.id)
    };

    t.subSkills.forEach(sub => {
      skills[sub.id] = {
        id: sub.id,
        name: sub.name,
        isParent: false,
        masteryProbability: DEFAULT_BKT_PARAMS.p_init,
        totalAttempts: 0,
        correctStreak: 0,
        averageResponseTime: 0
      };
    });
  });

  return { 
    hasCompletedPlacement: false,
    assignedCourses: [], // Por padrão, nenhum curso atribuído até o admin liberar
    skills, 
    history: [],
    flashcards: [],
    favorites: [],
    studyPlans: [] 
  };
};

/**
 * Helper: Migra estruturas antigas (single studyPlan) para array (studyPlans)
 */
const migrateData = (data: any): UserProgress => {
  if (!data) return getEmptyProgress();

  if (!data.assignedCourses) data.assignedCourses = [];
  if (!data.favorites) data.favorites = [];

  if (!data.studyPlans) {
    data.studyPlans = [];
    if (data.studyPlan) {
      if (!data.studyPlan.id) data.studyPlan.id = 'legacy_plan_' + Date.now();
      if (!data.studyPlan.title) data.studyPlan.title = data.studyPlan.category === 'math' ? 'Plano de Matemática' : 'Plano de Concurso';
      data.studyPlans.push(data.studyPlan);
      data.activePlanId = data.studyPlan.id;
      delete data.studyPlan;
    }
  }

  return data as UserProgress;
};

// Salva o progresso
export const saveUserProgress = async (userId: string, progress: UserProgress): Promise<void> => {
  // 1. Salva no LocalStorage (Backup local instantâneo)
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save to local storage', error);
  }

  // 2. Salva no Firestore (NUVEM - Permite que Admin altere dados do Aluno remotamente)
  if (db) {
    try {
      await setDoc(doc(db, "users", userId), progress, { merge: true });
      console.log("Progresso salvo no Firestore com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar no Firestore:", error);
    }
  }

  // 3. Tenta sincronizar com a API MySQL (se existir)
  try {
    await api.syncProgress(userId, progress);
  } catch (error) {
    // Silencioso se API não estiver configurada
  }
};

// Carrega o progresso via API, Firestore ou LocalStorage
export const loadUserProgress = async (userId: string): Promise<UserProgress> => {
  let loadedData: any = null;

  // 1. Tenta API MySQL primeiro (Prioridade máxima)
  try {
    const remoteData = await api.loadProgress(userId);
    if (remoteData) {
      return migrateData(remoteData);
    }
  } catch (error) {
    // API offline, continua...
  }

  // 2. Tenta Firestore (NUVEM - Prioridade secundária, essencial para Admin-Aluno sync)
  if (db) {
    try {
      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        loadedData = docSnap.data();
        console.log("Dados carregados do Firestore.");
        return migrateData(loadedData);
      }
    } catch (error) {
      console.warn("Erro ao ler do Firestore, tentando local storage.", error);
    }
  }

  // 3. Fallback LocalStorage (Último recurso)
  if (!loadedData) {
    try {
      const key = `${STORAGE_PREFIX}${userId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        loadedData = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load local progress', error);
    }
  }

  if (loadedData) {
    return migrateData(loadedData);
  }

  return getEmptyProgress();
};

/**
 * Encontra o ID do usuário através do email (Busca Híbrida: Local + Cloud).
 */
export const findUserIdByEmail = async (email: string): Promise<string | null> => {
  const normalizedEmail = email.trim().toLowerCase();
  
  // 1. Busca no Firestore (Global - permite Admin achar usuário que nunca logou nesta máquina)
  if (db) {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", normalizedEmail));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
      }
    } catch (e) {
      console.error("Erro ao buscar email no Firestore:", e);
    }
  }

  // 2. Varredura LocalStorage (Fallback Local)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.email && data.email.toLowerCase() === normalizedEmail) {
            return key.replace(STORAGE_PREFIX, '');
          }
        }
      }
    }
  } catch (e) {
    console.error("Erro na busca local por email:", e);
  }

  return null;
};

/**
 * Pending Permissions System
 */
export const savePendingPermission = (email: string, courses: string[]) => {
   try {
     const raw = localStorage.getItem(PENDING_PERMS_KEY);
     const allPending = raw ? JSON.parse(raw) : {};
     allPending[email.toLowerCase().trim()] = courses;
     localStorage.setItem(PENDING_PERMS_KEY, JSON.stringify(allPending));
   } catch (e) {
     console.error("Error saving pending permissions", e);
   }
}

export const getPendingPermissions = (email: string): string[] | null => {
   try {
     const raw = localStorage.getItem(PENDING_PERMS_KEY);
     if (!raw) return null;
     const allPending = JSON.parse(raw);
     return allPending[email.toLowerCase().trim()] || null;
   } catch (e) {
     return null;
   }
}

export const clearPendingPermission = (email: string) => {
    try {
      const raw = localStorage.getItem(PENDING_PERMS_KEY);
      if (!raw) return;
      const allPending = JSON.parse(raw);
      delete allPending[email.toLowerCase().trim()];
      localStorage.setItem(PENDING_PERMS_KEY, JSON.stringify(allPending));
    } catch (e) {
      console.error("Error clearing pending perm", e);
    }
}
