import { BKTParams, Difficulty, SkillState, Interaction } from '../types';
import { EXPECTED_TIME } from '../constants';

/**
 * Calculates BKT update with Time Analysis adjustments.
 * If user answers correctly but VERY slowly, confidence in mastery is lower (higher slip chance).
 * If user answers incorrectly but VERY quickly, it might be a careless guess (higher guess chance).
 */
const calculateBKT = (
  prevMastery: number,
  isCorrect: boolean,
  timeSpent: number,
  difficulty: Difficulty,
  params: BKTParams
): number => {
  let { p_transit, p_slip, p_guess } = params;

  const expected = EXPECTED_TIME[difficulty];

  // --- Time Analysis Heuristics ---
  if (isCorrect) {
    if (timeSpent > expected * 2.5) {
      // Correct but took way too long -> Reduce certainty (Treat as higher potential guess/struggle)
      p_guess += 0.15; 
      p_slip += 0.05; 
    } else if (timeSpent < expected * 0.2) {
      // Correct and suspiciously fast -> Could be lucky guess
      p_guess += 0.3;
    }
  } else {
    if (timeSpent < expected * 0.2) {
      // Incorrect and super fast -> Careless mistake (Slip)
      p_slip += 0.3; 
    }
    // Incorrect and slow -> Genuine lack of knowledge (Parameters stay standard)
  }

  // Clamp parameters
  p_guess = Math.min(0.5, p_guess);
  p_slip = Math.min(0.5, p_slip);

  // --- Standard BKT Formula ---
  let p_learned_given_evidence = 0;

  if (isCorrect) {
    const numerator = prevMastery * (1 - p_slip);
    const denominator = (prevMastery * (1 - p_slip)) + ((1 - prevMastery) * p_guess);
    p_learned_given_evidence = denominator === 0 ? 0 : numerator / denominator;
  } else {
    const numerator = prevMastery * p_slip;
    const denominator = (prevMastery * p_slip) + ((1 - prevMastery) * (1 - p_guess));
    p_learned_given_evidence = denominator === 0 ? 0 : numerator / denominator;
  }

  const p_next = p_learned_given_evidence + ((1 - p_learned_given_evidence) * p_transit);
  return Math.min(0.99, Math.max(0.01, p_next));
};

/**
 * Hierarchical Update:
 * 1. Updates the specific SubSkill.
 * 2. Updates the Parent Topic based on the SubSkill result, but with diluted parameters (partial evidence).
 */
export const updateHierarchicalKnowledge = (
  skills: { [key: string]: SkillState },
  interaction: Interaction,
  baseParams: BKTParams
): { [key: string]: SkillState } => {
  
  const newSkills = { ...skills };
  const { subSkillId, topicId, isCorrect, timeSpentSeconds, difficulty } = interaction;

  // 1. Update SubSkill
  const subSkill = newSkills[subSkillId];
  if (subSkill) {
    const newSubMastery = calculateBKT(
      subSkill.masteryProbability, 
      isCorrect, 
      timeSpentSeconds, 
      difficulty, 
      baseParams
    );

    newSkills[subSkillId] = {
      ...subSkill,
      masteryProbability: newSubMastery,
      totalAttempts: subSkill.totalAttempts + 1,
      correctStreak: isCorrect ? subSkill.correctStreak + 1 : 0,
      averageResponseTime: (subSkill.averageResponseTime * subSkill.totalAttempts + timeSpentSeconds) / (subSkill.totalAttempts + 1)
    };
  }

  // 2. Update Parent Topic (Hierarchical Link)
  // We treat the evidence on a subskill as "noisy" evidence for the whole topic
  const parentTopic = newSkills[topicId];
  if (parentTopic) {
    const parentParams = {
      ...baseParams,
      p_slip: baseParams.p_slip + 0.1, // Higher uncertainty for parent
      p_guess: baseParams.p_guess + 0.1
    };

    const newParentMastery = calculateBKT(
      parentTopic.masteryProbability,
      isCorrect,
      timeSpentSeconds,
      difficulty,
      parentParams
    );

    newSkills[topicId] = {
      ...parentTopic,
      masteryProbability: newParentMastery,
      totalAttempts: parentTopic.totalAttempts + 1,
      correctStreak: isCorrect ? parentTopic.correctStreak + 1 : 0
    };
  }

  return newSkills;
};

export const getDifficultyForMastery = (mastery: number): Difficulty => {
  if (mastery >= 0.90) return Difficulty.OLYMPIAD;
  if (mastery >= 0.70) return Difficulty.ADVANCED;
  if (mastery >= 0.40) return Difficulty.INTERMEDIATE;
  return Difficulty.BASIC;
};