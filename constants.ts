
import { BKTParams, Difficulty, TopicId } from './types';

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

export const EXPECTED_TIME = {
  [Difficulty.BASIC]: 45,
  [Difficulty.INTERMEDIATE]: 90,
  [Difficulty.ADVANCED]: 180,
  [Difficulty.OLYMPIAD]: 400
};

export const MATH_TOPICS = [
  { 
    id: TopicId.INTRO_COUNTING, 
    name: '1. Princípios Básicos', 
    description: 'O cerne do método Morgado: Princípio Aditivo e Multiplicativo (PFC).',
    subSkills: [
      { id: 'pfc_morgado', name: 'Princípio Fundamental da Contagem (PFC)', parentId: TopicId.INTRO_COUNTING },
      { id: 'pfc_restrictions', name: 'Problemas com Restrições (Onde começar?)', parentId: TopicId.INTRO_COUNTING },
      // Fix: Changed INTRO_CONTENT to INTRO_COUNTING to match the TopicId enum
      { id: 'pfc_circular_logic', name: 'Lógica de Formação de Conjuntos', parentId: TopicId.INTRO_COUNTING },
    ]
  },
  { 
    id: TopicId.PERMUTATIONS, 
    name: '2. Permutações e Simetria', 
    description: 'Arranjos de objetos e a elegância das Permutações Circulares.',
    subSkills: [
      { id: 'perm_simple', name: 'Permutações Simples', parentId: TopicId.PERMUTATIONS },
      { id: 'perm_repeat_logic', name: 'Permutações com Repetição (Anagramas)', parentId: TopicId.PERMUTATIONS },
      { id: 'perm_circular_morgado', name: 'Permutações Circulares', parentId: TopicId.PERMUTATIONS },
    ]
  },
  { 
    id: TopicId.COMBINATIONS, 
    name: '3. Escolhas e Subconjuntos', 
    description: 'Combinações Simples e Completas (Método dos Traços e Bolas).',
    subSkills: [
      { id: 'comb_simple', name: 'Combinações Simples (Subconjuntos)', parentId: TopicId.COMBINATIONS },
      { id: 'comb_complete_stars', name: 'Combinações Completas (Bolas e Urnas)', parentId: TopicId.COMBINATIONS },
      { id: 'kaplansky_basic', name: 'Introdução aos Lemas de Kaplansky', parentId: TopicId.COMBINATIONS },
    ]
  },
  {
    id: TopicId.ADVANCED_COUNTING,
    name: '4. Tópicos Avançados',
    description: 'Inclusão-Exclusão e Desarranjos (Permutações Caóticas).',
    subSkills: [
      { id: 'inclusion_exclusion', name: 'Princípio da Inclusão-Exclusão', parentId: TopicId.ADVANCED_COUNTING },
      { id: 'derangements', name: 'Desarranjos (Permutações Caóticas)', parentId: TopicId.ADVANCED_COUNTING },
      { id: 'dirichlet_pigeon', name: 'Princípio da Casa dos Pombos', parentId: TopicId.ADVANCED_COUNTING }
    ]
  }
];

export const CONCURSOS_TOPICS = [
  {
    id: TopicId.DIR_ADMINISTRATIVO,
    name: 'Direito Administrativo',
    description: 'Organização, atos, contratos e licitações.',
    subSkills: [
      { id: 'atos_adm', name: 'Atos Administrativos', parentId: TopicId.DIR_ADMINISTRATIVO },
      { id: 'licitacoes', name: 'Licitações (Lei 14.133)', parentId: TopicId.DIR_ADMINISTRATIVO },
      { id: 'poderes_adm', name: 'Poderes da Administração', parentId: TopicId.DIR_ADMINISTRATIVO }
    ]
  },
  {
    id: TopicId.DIR_CONSTITUCIONAL,
    name: 'Direito Constitucional',
    description: 'Direitos fundamentais e organização do estado.',
    subSkills: [
      { id: 'direitos_fund', name: 'Direitos e Garantias Fundamentais', parentId: TopicId.DIR_CONSTITUCIONAL },
      { id: 'org_poderes', name: 'Organização dos Poderes', parentId: TopicId.DIR_CONSTITUCIONAL },
      { id: 'controle_const', name: 'Controle de Constitucionalidade', parentId: TopicId.DIR_CONSTITUCIONAL }
    ]
  },
  {
    id: TopicId.DIR_PENAL,
    name: 'Direito Penal',
    description: 'Teoria do crime e crimes em espécie.',
    subSkills: [
      { id: 'teoria_crime', name: 'Teoria do Crime', parentId: TopicId.DIR_PENAL },
      { id: 'crimes_patrimonio', name: 'Crimes contra o Patrimônio', parentId: TopicId.DIR_PENAL },
      { id: 'crimes_adm', name: 'Crimes contra a Adm. Pública', parentId: TopicId.DIR_PENAL }
    ]
  },
  {
    id: TopicId.DIR_PROC_PENAL,
    name: 'Processo Penal',
    description: 'Inquérito, ação penal e prisões.',
    subSkills: [
      { id: 'inquerito_policial', name: 'Inquérito Policial', parentId: TopicId.DIR_PROC_PENAL },
      { id: 'prisoes', name: 'Prisões e Medidas Cautelares', parentId: TopicId.DIR_PROC_PENAL }
    ]
  },
  {
    id: TopicId.INFORMATICA,
    name: 'Informática',
    description: 'Sistemas, redes e segurança.',
    subSkills: [
      { id: 'seguranca_info', name: 'Segurança da Informação', parentId: TopicId.INFORMATICA },
      { id: 'redes_internet', name: 'Redes e Internet', parentId: TopicId.INFORMATICA }
    ]
  },
  {
    id: TopicId.RACIOCINIO_LOGICO,
    name: 'Raciocínio Lógico',
    description: 'Proposições, diagramas e sequências.',
    subSkills: [
      { id: 'logica_proposicional', name: 'Lógica Proposicional', parentId: TopicId.RACIOCINIO_LOGICO },
      { id: 'analise_combinatoria_rl', name: 'Análise Combinatória p/ Concursos', parentId: TopicId.RACIOCINIO_LOGICO }
    ]
  }
];

export const TOPICS_DATA = [...MATH_TOPICS, ...CONCURSOS_TOPICS];
