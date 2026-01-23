
import { UserProgress, TopicId, SkillState } from '../types';
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
    favorites: []
  };
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
  // 1. Tenta API
  try {
    const remoteData = await api.loadProgress(userId);
    if (remoteData) {
      // Migrações defensivas
      if (!remoteData.favorites) remoteData.favorites = [];
      if (!remoteData.assignedCourses) remoteData.assignedCourses = []; // Garante array
      return remoteData;
    }
  } catch (error) {
    console.warn('API offline or user not found, checking local storage.');
  }

  // 2. Fallback LocalStorage
  try {
    const key = `${STORAGE_PREFIX}${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!parsed.favorites) parsed.favorites = [];
      if (!parsed.assignedCourses) parsed.assignedCourses = [];
      return parsed;
    }
  } catch (error) {
    console.error('Failed to load local progress', error);
  }

  return getEmptyProgress();
};
