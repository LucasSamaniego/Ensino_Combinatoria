export enum Difficulty {
  BASIC = 'Basic',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
  OLYMPIAD = 'Olympiad'
}

export enum TopicId {
  INTRO_COUNTING = 'intro_counting',
  PERMUTATIONS = 'permutations',
  COMBINATIONS = 'combinations',
  ADVANCED_COUNTING = 'advanced_counting',
  BINOMIAL_NUMBERS = 'binomial_numbers',
  PROBABILITY = 'probability'
}

export interface SubSkill {
  id: string;
  name: string;
  parentId: TopicId;
}

export interface SkillState {
  id: string; // Can be TopicId or SubSkillId
  name: string;
  isParent: boolean;
  masteryProbability: number; // P(L)
  totalAttempts: number;
  correctStreak: number;
  averageResponseTime: number; // in seconds
  subSkillIds?: string[]; // If parent
}

export interface Interaction {
  id: string;
  timestamp: number;
  topicId: TopicId;
  subSkillId: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  difficulty: Difficulty;
}

export interface VisualizationData {
  type: 'venn' | 'slots' | 'circular' | 'urn' | 'graph' | 'none';
  data: any; // Flexible payload based on type
  label?: string;
}

export interface Question {
  id: string;
  text: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: Difficulty;
  topicId: TopicId;
  subSkillId: string;
  subSkillName: string;
  visualization?: VisualizationData;
  hints?: string[];     // Dicas progressivas
  miniTheory?: string;  // Teoria curta (Just-in-time)
}

export interface TheoryContent {
  title: string;
  content: string; // Markdown/Text explanation with LaTeX
  example: string;
  visualization?: VisualizationData;
}

export interface BKTParams {
  p_init: number;
  p_transit: number;
  p_slip: number;
  p_guess: number;
}

export interface UserProgress {
  hasCompletedPlacement: boolean; // Flag para teste de nivelamento
  skills: { [key: string]: SkillState }; // Flattens both Topics and SubSkills for easy access
  history: Interaction[];
}

export interface GraphNode {
  id: string;
  label: string;
  status: 'mastered' | 'progress' | 'pending';
  x: number; // Coordinate 0-100 for visualization
  y: number; // Coordinate 0-100 for visualization
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface ReportData {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendedFocus: string;
  role: 'student' | 'teacher';
  knowledgeGraph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
}

export interface SimulationConfig {
  id: string;
  title: string;
  description: string;
  style: 'School' | 'Concurso' | 'Olympiad' | 'Military'; // Military = ITA/IME/AFA
  questionCount: number;
  difficulty: Difficulty;
}