
import { UserProgress, TopicId, SkillState, StudyPlan } from '../types';
import { TOPICS_DATA, DEFAULT_BKT_PARAMS } from '../constants';
import { api } from './api';

const STORAGE_PREFIX = 'plataforma_estudos_v1_';

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
    studyPlans: [] // Start with empty array
  };
};

/**
 * Helper: Migra estruturas antigas (single studyPlan) para array (studyPlans)
 */
const migrateData = (data: any): UserProgress => {
  if (!data) return getEmptyProgress();

  // Garante array de cursos
  if (!data.assignedCourses) data.assignedCourses = [];
  
  // Garante array de favoritos
  if (!data.favorites) data.favorites = [];

  // Garante array de planos (Migração Principal)
  if (!data.studyPlans) {
    data.studyPlans = [];
    // Se existir um plano antigo legado, migra para o array
    if (data.studyPlan) {
      // Adiciona ID se não tiver
      if (!data.studyPlan.id) {
        data.studyPlan.id = 'legacy_plan_' + Date.now();
      }
      // Adiciona título se não tiver
      if (!data.studyPlan.title) {
        data.studyPlan.title = data.studyPlan.category === 'math' ? 'Plano de Matemática' : 'Plano de Concurso';
      }
      data.studyPlans.push(data.studyPlan);
      // Define como ativo por padrão
      data.activePlanId = data.studyPlan.id;
      delete data.studyPlan; // Remove campo legado para limpeza
    }
  }

  return data as UserProgress;
};

// Salva o progresso via API (MySQL)
export const saveUserProgress = async (userId: string, progress: UserProgress): Promise<void> => {
  try {
    await api.syncProgress(userId, progress);
  } catch (error) {
    console.error('Failed to sync progress to API, saving locally', error);
    // Fallback LocalStorage
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(progress));
  }
};

// Carrega o progresso via API (MySQL)
export const loadUserProgress = async (userId: string): Promise<UserProgress> => {
  let loadedData: any = null;

  // 1. Tenta API
  try {
    const remoteData = await api.loadProgress(userId);
    if (remoteData) {
      loadedData = remoteData;
    }
  } catch (error) {
    console.warn('API offline or user not found, checking local storage.');
  }

  // 2. Fallback LocalStorage se API falhar ou não tiver dados
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

  // 3. Aplica migração e retorna (ou retorna vazio se nada encontrado)
  if (loadedData) {
    return migrateData(loadedData);
  }

  return getEmptyProgress();
};

/**
 * NEW: Encontra o ID do usuário através do email (para Admin).
 * Varre o LocalStorage em busca de um objeto que contenha o e-mail correspondente.
 */
export const findUserIdByEmail = async (email: string): Promise<string | null> => {
  const normalizedEmail = email.trim().toLowerCase();
  
  // 1. Tenta API se disponível (Mocked for now in api.ts as likely unavailable in simple backend)
  // ...

  // 2. Varredura LocalStorage (Modo Demo/Local)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.email && data.email.toLowerCase() === normalizedEmail) {
            // Remove o prefixo para retornar apenas o UID
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
