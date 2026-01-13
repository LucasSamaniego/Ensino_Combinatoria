import { BKTParams, Difficulty, TopicId, SubSkill } from './types';

export const DEFAULT_BKT_PARAMS: BKTParams = {
  p_init: 0.10,
  p_transit: 0.15, 
  p_slip: 0.10,   
  p_guess: 0.20    
};

export const DIFFICULTY_THRESHOLDS = {
  [Difficulty.BASIC]: 0.0,
  [Difficulty.INTERMEDIATE]: 0.4,
  [Difficulty.ADVANCED]: 0.75,
  [Difficulty.OLYMPIAD]: 0.90
};

// Expected time (seconds) per difficulty for analysis
export const EXPECTED_TIME = {
  [Difficulty.BASIC]: 45,
  [Difficulty.INTERMEDIATE]: 90,
  [Difficulty.ADVANCED]: 180,
  [Difficulty.OLYMPIAD]: 400
};

export const TOPICS_DATA = [
  { 
    id: TopicId.INTRO_COUNTING, 
    name: '1. Introdução e Princípios', 
    description: 'Princípios fundamentais e conjuntos.',
    subSkills: [
      { id: 'pfc', name: 'Princípio Fundamental da Contagem (PFC)', parentId: TopicId.INTRO_COUNTING },
      { id: 'sets_basic', name: 'Conjuntos e Subconjuntos', parentId: TopicId.INTRO_COUNTING },
      { id: 'counting_problems', name: 'Problemas Básicos de Contagem', parentId: TopicId.INTRO_COUNTING },
    ]
  },
  { 
    id: TopicId.PERMUTATIONS, 
    name: '2. Permutações', 
    description: 'Ordenação de elementos distintos e com repetição.',
    subSkills: [
      { id: 'perm_simple', name: 'Permutações Simples', parentId: TopicId.PERMUTATIONS },
      { id: 'perm_circular', name: 'Permutações Circulares', parentId: TopicId.PERMUTATIONS },
      { id: 'perm_repeat', name: 'Permutações com Repetição', parentId: TopicId.PERMUTATIONS },
    ]
  },
  { 
    id: TopicId.COMBINATIONS, 
    name: '2. Combinações', 
    description: 'Escolhas não ordenadas e soluções inteiras.',
    subSkills: [
      { id: 'comb_simple', name: 'Combinações Simples', parentId: TopicId.COMBINATIONS },
      { id: 'arrangements', name: 'Arranjos Simples', parentId: TopicId.COMBINATIONS },
      { id: 'comb_complete', name: 'Combinações Completas (Soluções Inteiras)', parentId: TopicId.COMBINATIONS },
    ]
  },
  { 
    id: TopicId.ADVANCED_COUNTING, 
    name: '3. Outros Métodos de Contagem', 
    description: 'Técnicas avançadas e princípios especiais.',
    subSkills: [
      { id: 'inclusion_exclusion', name: 'Princípio da Inclusão-Exclusão', parentId: TopicId.ADVANCED_COUNTING },
      { id: 'derangements', name: 'Permutações Caóticas (Desarranjos)', parentId: TopicId.ADVANCED_COUNTING },
      { id: 'kaplansky', name: 'Lemas de Kaplansky', parentId: TopicId.ADVANCED_COUNTING },
      { id: 'reflection', name: 'Princípio da Reflexão', parentId: TopicId.ADVANCED_COUNTING },
      { id: 'pigeonhole', name: 'Princípio das Gavetas de Dirichlet', parentId: TopicId.ADVANCED_COUNTING },
    ]
  },
  { 
    id: TopicId.BINOMIAL_NUMBERS, 
    name: '4. Números Binomiais', 
    description: 'Pascal, Newton e Leibniz.',
    subSkills: [
      { id: 'pascal_triangle', name: 'Triângulo de Pascal e Propriedades', parentId: TopicId.BINOMIAL_NUMBERS },
      { id: 'newton_binomial', name: 'Binômio de Newton', parentId: TopicId.BINOMIAL_NUMBERS },
      { id: 'leibniz_poly', name: 'Polinômio de Leibniz', parentId: TopicId.BINOMIAL_NUMBERS },
    ]
  },
  { 
    id: TopicId.PROBABILITY, 
    name: '5. Probabilidade', 
    description: 'Espaços de Laplace e condicional.',
    subSkills: [
      { id: 'laplace_def', name: 'Definição de Laplace e Espaço Amostral', parentId: TopicId.PROBABILITY },
      { id: 'prob_conditional', name: 'Probabilidade Condicional e Independência', parentId: TopicId.PROBABILITY },
      { id: 'binomial_dist', name: 'Distribuição Binomial', parentId: TopicId.PROBABILITY },
    ]
  }
];