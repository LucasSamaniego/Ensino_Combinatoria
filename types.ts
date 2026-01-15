
export enum Difficulty {
  BASIC = 'Basic',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
  OLYMPIAD = 'Olympiad'
}

export enum TopicId {
  // Matemática Básica - Realfabetização (Módulos 0-7)
  MATH_BASICS_DIAGNOSTIC = 'math_basics_0_diagnostic',
  MATH_BASICS_NUMBER_SENSE = 'math_basics_1_number_sense',
  MATH_BASICS_DECIMAL_SYSTEM = 'math_basics_2_decimal_system',
  MATH_BASICS_ADD_SUB = 'math_basics_3_add_sub',
  MATH_BASICS_MULT_DIV = 'math_basics_4_mult_div',
  MATH_BASICS_FRACTIONS = 'math_basics_5_fractions',
  MATH_BASICS_MEASURES = 'math_basics_6_measures',
  MATH_BASICS_INTERPRETATION = 'math_basics_7_interpretation',

  // Matemática - Combinatória
  INTRO_COUNTING = 'intro_counting',
  PERMUTATIONS = 'permutations',
  COMBINATIONS = 'combinations',
  ADVANCED_COUNTING = 'advanced_counting',
  BINOMIAL_NUMBERS = 'binomial_numbers',
  PROBABILITY = 'probability',
  
  // Concursos - Direito
  DIR_ADMINISTRATIVO = 'dir_administrativo',
  DIR_PENAL = 'dir_penal',
  DIR_PROC_PENAL = 'dir_proc_penal',
  DIR_CONSTITUCIONAL = 'dir_constitucional',
  
  // Concursos - Geral
  INFORMATICA = 'informatica',
  RACIOCINIO_LOGICO = 'raciocinio_logico'
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
}

export interface SubSkill {
  id: string;
  name: string;
  parentId: TopicId;
}

export interface SkillState {
  id: string; 
  name: string;
  isParent: boolean;
  masteryProbability: number; 
  totalAttempts: number;
  correctStreak: number;
  averageResponseTime: number; 
  subSkillIds?: string[]; 
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
  type: 'venn' | 'slots' | 'circular' | 'urn' | 'graph' | 'law_article' | 'flowchart' | 'none';
  data: any; 
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
  hints?: string[];     
  miniTheory?: string;
  banca?: string; // Identifica a banca examinadora (ex: FGV, CESPE)
  source?: string; // Novo: Identifica a fonte olímpica (ex: OBMEP 2023 - Brasil)
}

export interface TheoryContent {
  title: string;
  content: string; 
  example: string;
  visualization?: VisualizationData;
}

export interface BKTParams {
  p_init: number;
  p_transit: number;
  p_slip: number;
  p_guess: number;
}

export interface SRSState {
  interval: number; 
  repetition: number; 
  easeFactor: number; 
  nextReviewDate: number; 
}

export interface Flashcard {
  id: string;
  topicId: TopicId;
  front: string; 
  back: string; 
  srs: SRSState;
}

export interface UserProgress {
  hasCompletedPlacement: boolean; 
  skills: { [key: string]: SkillState }; 
  history: Interaction[];
  flashcards: Flashcard[]; 
  favorites: Question[]; // Questões favoritadas pelo usuário
}

export interface GraphNode {
  id: string;
  label: string;
  status: 'mastered' | 'progress' | 'pending';
  x: number; 
  y: number; 
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
  style: 'School' | 'Concurso' | 'Olympiad' | 'Military'; 
  questionCount: number;
  difficulty: Difficulty;
}
