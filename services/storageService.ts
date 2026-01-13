
import { UserProgress, TopicId, SkillState } from '../types';
import { TOPICS_DATA, DEFAULT_BKT_PARAMS } from '../constants';

const STORAGE_PREFIX = 'plataforma_estudos_v1_';

export const getEmptyProgress = (): UserProgress => {
  const skills: { [key: string]: SkillState } = {};
    
  // Initialize all skills at basic level
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
    skills, 
    history: [],
    flashcards: []
  };
};

export const saveUserProgress = (userId: string, progress: UserProgress): void => {
  try {
    const key = `${STORAGE_PREFIX}${userId}`;
    localStorage.setItem(key, JSON.stringify(progress));
    // console.log('Progress saved for', userId);
  } catch (error) {
    console.error('Failed to save progress', error);
  }
};

export const loadUserProgress = (userId: string): UserProgress => {
  try {
    const key = `${STORAGE_PREFIX}${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load progress', error);
  }
  return getEmptyProgress();
};
