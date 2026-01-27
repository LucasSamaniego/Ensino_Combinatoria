
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

export const translateDifficulty = (diff: string): string => {
  switch (diff) {
    case 'Basic': return 'Básico';
    case 'Intermediate': return 'Intermediário';
    case 'Advanced': return 'Avançado';
    case 'Olympiad': return 'Olímpico';
    default: return diff;
  }
};

// --- MÓDULOS DE MATEMÁTICA BÁSICA (Neuroeducação & Realfabetização) ---

export const BASIC_MATH_TOPICS = [
  {
    id: TopicId.MATH_BASICS_DIAGNOSTIC,
    name: 'Diagnóstico Inicial',
    description: 'Identificação de falhas conceituais e operacionais sem nota.',
    subSkills: [
      { id: 'diag_conceptual', name: 'Conceitos Numéricos', parentId: TopicId.MATH_BASICS_DIAGNOSTIC },
      { id: 'diag_operational', name: 'Operações Básicas', parentId: TopicId.MATH_BASICS_DIAGNOSTIC },
      { id: 'diag_interpretation', name: 'Interpretação de Problemas', parentId: TopicId.MATH_BASICS_DIAGNOSTIC }
    ]
  },
  {
    id: TopicId.MATH_BASICS_NUMBER_SENSE,
    name: 'Noção de Número',
    description: 'Quantidade, comparação, ordem e estimativa.',
    subSkills: [
      { id: 'num_quantity', name: 'Número como Quantidade', parentId: TopicId.MATH_BASICS_NUMBER_SENSE },
      { id: 'num_comparison', name: 'Comparação e Ordem', parentId: TopicId.MATH_BASICS_NUMBER_SENSE },
      { id: 'num_decomposition', name: 'Decomposição Numérica', parentId: TopicId.MATH_BASICS_NUMBER_SENSE },
      { id: 'num_estimation', name: 'Estimativa', parentId: TopicId.MATH_BASICS_NUMBER_SENSE }
    ]
  },
  {
    id: TopicId.MATH_BASICS_DECIMAL_SYSTEM,
    name: 'Sistema Decimal',
    description: 'Valor posicional, base 10 e trocas.',
    subSkills: [
      { id: 'dec_base10', name: 'Agrupamento Base 10', parentId: TopicId.MATH_BASICS_DECIMAL_SYSTEM },
      { id: 'dec_place_value', name: 'Unidade, Dezena, Centena', parentId: TopicId.MATH_BASICS_DECIMAL_SYSTEM },
      { id: 'dec_reading_writing', name: 'Leitura e Escrita', parentId: TopicId.MATH_BASICS_DECIMAL_SYSTEM }
    ]
  },
  {
    id: TopicId.MATH_BASICS_ADD_SUB,
    name: 'Adição e Subtração',
    description: 'Compreensão conceitual: juntar, tirar e comparar.',
    subSkills: [
      { id: 'op_add_concept', name: 'Conceito de Juntar', parentId: TopicId.MATH_BASICS_ADD_SUB },
      { id: 'op_sub_concept', name: 'Conceito de Tirar/Comparar', parentId: TopicId.MATH_BASICS_ADD_SUB },
      { id: 'op_visual_reps', name: 'Representações Visuais', parentId: TopicId.MATH_BASICS_ADD_SUB }
    ]
  },
  {
    id: TopicId.MATH_BASICS_MULT_DIV,
    name: 'Multiplicação e Divisão',
    description: 'Grupos, repartição e relação inversa (sem decoreba).',
    subSkills: [
      { id: 'mult_groups', name: 'Parcelas Iguais e Grupos', parentId: TopicId.MATH_BASICS_MULT_DIV },
      { id: 'div_grouping', name: 'Repartição e Agrupamento', parentId: TopicId.MATH_BASICS_MULT_DIV },
      { id: 'mult_div_relation', name: 'Relação Inversa', parentId: TopicId.MATH_BASICS_MULT_DIV }
    ]
  },
  {
    id: TopicId.MATH_BASICS_FRACTIONS,
    name: 'Frações e Decimais',
    description: 'Parte do todo e aplicações cotidianas.',
    subSkills: [
      { id: 'frac_concept', name: 'Conceito de Parte/Todo', parentId: TopicId.MATH_BASICS_FRACTIONS },
      { id: 'frac_visual', name: 'Representações Visuais', parentId: TopicId.MATH_BASICS_FRACTIONS },
      { id: 'decimal_conversion', name: 'Decimais e Dinheiro', parentId: TopicId.MATH_BASICS_FRACTIONS }
    ]
  },
  {
    id: TopicId.MATH_BASICS_MEASURES,
    name: 'Medidas e Grandezas',
    description: 'Comprimento, massa, capacidade e tempo.',
    subSkills: [
      { id: 'meas_length_mass', name: 'Comprimento e Massa', parentId: TopicId.MATH_BASICS_MEASURES },
      { id: 'meas_time', name: 'Tempo e Calendário', parentId: TopicId.MATH_BASICS_MEASURES },
      { id: 'meas_estimation', name: 'Estimativa de Grandezas', parentId: TopicId.MATH_BASICS_MEASURES }
    ]
  },
  {
    id: TopicId.MATH_BASICS_INTERPRETATION,
    name: 'Interpretação',
    description: 'Tradução de textos para operações matemáticas.',
    subSkills: [
      { id: 'interp_data', name: 'Identificação de Dados', parentId: TopicId.MATH_BASICS_INTERPRETATION },
      { id: 'interp_question', name: 'Identificação da Pergunta', parentId: TopicId.MATH_BASICS_INTERPRETATION },
      { id: 'interp_translation', name: 'Tradução Texto-Operação', parentId: TopicId.MATH_BASICS_INTERPRETATION }
    ]
  }
];

export const COMBINATORICS_TOPICS = [
  { 
    id: TopicId.INTRO_COUNTING, 
    name: 'Princípios Básicos', 
    description: 'O cerne do método Morgado: Princípio Aditivo e Multiplicativo (PFC).',
    subSkills: [
      { id: 'pfc_morgado', name: 'Princípio Fundamental da Contagem (PFC)', parentId: TopicId.INTRO_COUNTING },
      { id: 'pfc_restrictions', name: 'Problemas com Restrições (Onde começar?)', parentId: TopicId.INTRO_COUNTING },
      { id: 'pfc_circular_logic', name: 'Lógica de Formação de Conjuntos', parentId: TopicId.INTRO_COUNTING },
    ]
  },
  { 
    id: TopicId.PERMUTATIONS, 
    name: 'Permutações e Simetria', 
    description: 'Arranjos de objetos e a elegância das Permutações Circulares.',
    subSkills: [
      { id: 'perm_simple', name: 'Permutações Simples', parentId: TopicId.PERMUTATIONS },
      { id: 'perm_repeat_logic', name: 'Permutações com Repetição (Anagramas)', parentId: TopicId.PERMUTATIONS },
      { id: 'perm_circular_morgado', name: 'Permutações Circulares', parentId: TopicId.PERMUTATIONS },
    ]
  },
  { 
    id: TopicId.COMBINATIONS, 
    name: 'Escolhas e Subconjuntos', 
    description: 'Combinações Simples e Completas (Método dos Traços e Bolas).',
    subSkills: [
      { id: 'comb_simple', name: 'Combinações Simples (Subconjuntos)', parentId: TopicId.COMBINATIONS },
      { id: 'comb_complete_stars', name: 'Combinações Completas (Bolas e Urnas)', parentId: TopicId.COMBINATIONS },
      { id: 'kaplansky_basic', name: 'Introdução aos Lemas de Kaplansky', parentId: TopicId.COMBINATIONS },
    ]
  },
  {
    id: TopicId.ADVANCED_COUNTING,
    name: 'Tópicos Avançados',
    description: 'Inclusão-Exclusão e Desarranjos (Permutações Caóticas).',
    subSkills: [
      { id: 'inclusion_exclusion', name: 'Princípio da Inclusão-Exclusão', parentId: TopicId.ADVANCED_COUNTING },
      { id: 'derangements', name: 'Desarranjos (Permutações Caóticas)', parentId: TopicId.ADVANCED_COUNTING },
      { id: 'dirichlet_pigeon', name: 'Princípio da Casa dos Pombos', parentId: TopicId.ADVANCED_COUNTING }
    ]
  }
];

export const GENERAL_MATH_TOPICS = [
  {
    id: TopicId.ARITHMETIC,
    name: 'Aritmética',
    description: 'Teoria dos números, divisibilidade e modularidade.',
    subSkills: [
      { id: 'arith_primes', name: 'Números Primos e Fatoração', parentId: TopicId.ARITHMETIC },
      { id: 'arith_divisibility', name: 'Critérios de Divisibilidade', parentId: TopicId.ARITHMETIC },
      { id: 'arith_modular', name: 'Aritmética Modular Básica', parentId: TopicId.ARITHMETIC }
    ]
  },
  {
    id: TopicId.ALGEBRA,
    name: 'Álgebra',
    description: 'Equações, funções, polinômios e sistemas.',
    subSkills: [
      { id: 'alg_functions', name: 'Funções e Gráficos', parentId: TopicId.ALGEBRA },
      { id: 'alg_polynomials', name: 'Polinômios e Raízes', parentId: TopicId.ALGEBRA },
      { id: 'alg_systems', name: 'Sistemas Lineares e Matrizes', parentId: TopicId.ALGEBRA }
    ]
  },
  {
    id: TopicId.GEOMETRY_FLAT,
    name: 'Geometria Plana',
    description: 'Figuras, áreas, semelhança e teoremas clássicos.',
    subSkills: [
      { id: 'geo_triangles', name: 'Triângulos e Semelhança', parentId: TopicId.GEOMETRY_FLAT },
      { id: 'geo_circles', name: 'Círculos e Circunferências', parentId: TopicId.GEOMETRY_FLAT },
      { id: 'geo_areas', name: 'Áreas de Figuras Planas', parentId: TopicId.GEOMETRY_FLAT }
    ]
  },
  {
    id: TopicId.GEOMETRY_SPATIAL,
    name: 'Geometria Espacial',
    description: 'Sólidos, volumes e projeções.',
    subSkills: [
      { id: 'geo_prisms', name: 'Prismas e Pirâmides', parentId: TopicId.GEOMETRY_SPATIAL },
      { id: 'geo_solids_rev', name: 'Cilindros, Cones e Esferas', parentId: TopicId.GEOMETRY_SPATIAL },
      { id: 'geo_projections', name: 'Vistas e Projeções', parentId: TopicId.GEOMETRY_SPATIAL }
    ]
  },
  {
    id: TopicId.GEOMETRY_ANALYTIC,
    name: 'Geometria Analítica',
    description: 'Pontos, retas e cônicas no plano cartesiano.',
    subSkills: [
      { id: 'ana_lines', name: 'Ponto e Reta', parentId: TopicId.GEOMETRY_ANALYTIC },
      { id: 'ana_circles', name: 'Circunferência', parentId: TopicId.GEOMETRY_ANALYTIC },
      { id: 'ana_conics', name: 'Cônicas (Elipse, Hipérbole, Parábola)', parentId: TopicId.GEOMETRY_ANALYTIC }
    ]
  },
  {
    id: TopicId.TRIGONOMETRY,
    name: 'Trigonometria',
    description: 'Ciclo trigonométrico, funções e identidades.',
    subSkills: [
      { id: 'trig_circle', name: 'Ciclo Trigonométrico', parentId: TopicId.TRIGONOMETRY },
      { id: 'trig_functions', name: 'Funções Seno e Cosseno', parentId: TopicId.TRIGONOMETRY },
      { id: 'trig_identities', name: 'Identidades e Equações', parentId: TopicId.TRIGONOMETRY }
    ]
  },
  {
    id: TopicId.CALCULUS_1,
    name: 'Cálculo I',
    description: 'Limites, Derivadas e Integrais de uma variável.',
    subSkills: [
      { id: 'calc1_limits', name: 'Limites e Continuidade', parentId: TopicId.CALCULUS_1 },
      { id: 'calc1_derivatives', name: 'Derivadas e Aplicações', parentId: TopicId.CALCULUS_1 },
      { id: 'calc1_integrals', name: 'Integrais Definidas e Indefinidas', parentId: TopicId.CALCULUS_1 }
    ]
  },
  {
    id: TopicId.CALCULUS_2,
    name: 'Cálculo II',
    description: 'Técnicas de integração, sequências e séries.',
    subSkills: [
      { id: 'calc2_integration_tech', name: 'Técnicas de Integração', parentId: TopicId.CALCULUS_2 },
      { id: 'calc2_series', name: 'Sequências e Séries', parentId: TopicId.CALCULUS_2 },
      { id: 'calc2_ode', name: 'EDOs de 1ª Ordem', parentId: TopicId.CALCULUS_2 }
    ]
  },
  {
    id: TopicId.CALCULUS_3,
    name: 'Cálculo III',
    description: 'Cálculo vetorial e de múltiplas variáveis.',
    subSkills: [
      { id: 'calc3_multivar', name: 'Funções de Várias Variáveis', parentId: TopicId.CALCULUS_3 },
      { id: 'calc3_multiple_int', name: 'Integrais Múltiplas', parentId: TopicId.CALCULUS_3 },
      { id: 'calc3_vector', name: 'Cálculo Vetorial (Green, Stokes)', parentId: TopicId.CALCULUS_3 }
    ]
  }
];

// --- MÓDULOS DE PORTUGUÊS ---

export const PORTUGUESE_TOPICS = [
  {
    id: TopicId.PORT_GRAMMAR,
    name: 'Gramática',
    description: 'Morfologia, Fonologia e Classes de Palavras.',
    subSkills: [
      { id: 'port_morphology', name: 'Morfologia e Estrutura', parentId: TopicId.PORT_GRAMMAR },
      { id: 'port_verb_tense', name: 'Verbos e Tempos', parentId: TopicId.PORT_GRAMMAR },
      { id: 'port_pronouns', name: 'Pronomes e Colocação', parentId: TopicId.PORT_GRAMMAR }
    ]
  },
  {
    id: TopicId.PORT_SYNTAX,
    name: 'Sintaxe',
    description: 'Análise sintática, concordância e regência.',
    subSkills: [
      { id: 'port_period_simple', name: 'Termos da Oração', parentId: TopicId.PORT_SYNTAX },
      { id: 'port_agreement', name: 'Concordância Nominal/Verbal', parentId: TopicId.PORT_SYNTAX },
      { id: 'port_regency_crase', name: 'Regência e Crase', parentId: TopicId.PORT_SYNTAX }
    ]
  },
  {
    id: TopicId.PORT_SEMANTICS,
    name: 'Semântica',
    description: 'Sentido das palavras, ambiguidade e figuras de linguagem.',
    subSkills: [
      { id: 'port_meaning', name: 'Sinônimos e Antônimos', parentId: TopicId.PORT_SEMANTICS },
      { id: 'port_figures', name: 'Figuras de Linguagem', parentId: TopicId.PORT_SEMANTICS },
      { id: 'port_cohesion', name: 'Coesão e Coerência', parentId: TopicId.PORT_SEMANTICS }
    ]
  },
  {
    id: TopicId.PORT_LITERATURE,
    name: 'Literatura',
    description: 'Movimentos literários, escolas e obras clássicas.',
    subSkills: [
      { id: 'port_schools_br', name: 'Escolas Literárias (BR)', parentId: TopicId.PORT_LITERATURE },
      { id: 'port_modernism', name: 'Modernismo', parentId: TopicId.PORT_LITERATURE },
      { id: 'port_genres', name: 'Gêneros Literários', parentId: TopicId.PORT_LITERATURE }
    ]
  },
  {
    id: TopicId.PORT_TEXT_INTERP,
    name: 'Interpretação de Texto',
    description: 'Compreensão, tipologia textual e inferência.',
    subSkills: [
      { id: 'port_text_types', name: 'Tipologia Textual', parentId: TopicId.PORT_TEXT_INTERP },
      { id: 'port_inference', name: 'Inferência e Implícitos', parentId: TopicId.PORT_TEXT_INTERP },
      { id: 'port_intertext', name: 'Intertextualidade', parentId: TopicId.PORT_TEXT_INTERP }
    ]
  },
  {
    id: TopicId.PORT_WRITING,
    name: 'Redação',
    description: 'Estrutura dissertativa, argumentação e repertório.',
    subSkills: [
      { id: 'port_essay_structure', name: 'Estrutura Dissertativa', parentId: TopicId.PORT_WRITING },
      { id: 'port_argumentation', name: 'Estratégias Argumentativas', parentId: TopicId.PORT_WRITING },
      { id: 'port_competencies', name: 'Competências do ENEM', parentId: TopicId.PORT_WRITING }
    ]
  }
];

// Lista unificada para o sistema de armazenamento/progresso
export const MATH_TOPICS = [...BASIC_MATH_TOPICS, ...COMBINATORICS_TOPICS, ...GENERAL_MATH_TOPICS];

// --- MÓDULOS DE CONCURSOS ---

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
  // SEPARAÇÃO: Raciocínio Lógico (Puro)
  {
    id: TopicId.RACIOCINIO_LOGICO,
    name: 'Raciocínio Lógico',
    description: 'Lógica Proposicional, Tabelas-Verdade e Argumentação.',
    subSkills: [
      { id: 'logica_proposicional', name: 'Lógica Proposicional (Conectivos)', parentId: TopicId.RACIOCINIO_LOGICO },
      { id: 'tabela_verdade', name: 'Tabelas-Verdade e Equivalências', parentId: TopicId.RACIOCINIO_LOGICO },
      { id: 'diagramas_logicos', name: 'Diagramas Lógicos e Argumentos', parentId: TopicId.RACIOCINIO_LOGICO }
    ]
  }
];

export const TOPICS_DATA = [...MATH_TOPICS, ...PORTUGUESE_TOPICS, ...CONCURSOS_TOPICS];
