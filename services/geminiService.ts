
import { GoogleGenAI, Type } from "@google/genai";
import { Question, Difficulty, TopicId, Interaction, ReportData, TheoryContent, SimulationConfig, Flashcard, StudyPlan, StudyWeek } from '../types';
import { getInitialSRSState } from './srsService';

// Lazy initialization to prevent crash on load if API key is missing
let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

const MODEL_FLASH = 'gemini-3-flash-preview';
const MODEL_REASONING = 'gemini-3-pro-preview';

const LATEX_INSTRUCTION = `
    IMPORTANTE SOBRE JSON E LATEX:
    Como sua saída é um JSON, você deve ESCAPAR DUPLAMENTE as barras invertidas do LaTeX.
    - Correto: "\\\\times", "\\\\frac", "\\\\{".
`;

export const generateProblem = async (
  category: 'math' | 'concursos',
  topicName: string,
  topicId: TopicId,
  subSkillId: string,
  subSkillName: string,
  currentDifficulty: string
): Promise<Question> => {
  
  let persona = "";
  let constraints = "";
  
  // Verificação se é Matemática Básica (Módulos 0-7)
  const isBasicMath = topicId.startsWith('math_basics_');

  if (category === 'math') {
    if (isBasicMath) {
      persona = "Você é um especialista em educação matemática, neuroeducação e design instrucional, focado em realfabetização matemática.";
      constraints = `
        SIGA RIGOROSAMENTE AS SEGUINTES REGRAS DE DESIGN INSTRUCIONAL:
        1. **Objetivo**: Realfabetização matemática. Priorize compreensão conceitual antes de algoritmos.
        2. **Linguagem**: Simples, concreta, acessível e motivadora. Evite punição ou tecnicismo excessivo.
        3. **Contexto**: Use exemplos do cotidiano (dinheiro, objetos, situações reais).
        4. **Classificação de Erro**: O campo "explanation" deve fornecer feedback explicativo baseado na causa do erro (ex: confusão de valor posicional), não apenas a resposta.
        5. **Microprogressão**: A questão deve ser adequada para quem tem defasagem escolar ou ansiedade matemática.
        6. **Visualização**: Se possível, solicite visualização do tipo 'slots' (para valor posicional) ou 'venn' (para conjuntos/classificação).
        7. **Proibido**: Atalhos algorítmicos sem explicação conceitual prévia e memorização mecânica.
        
        CONTEXTO ESPECÍFICO DO TÓPICO:
        - Se for Tópico 1 (Noção de Número): Foco em quantidade, ordem e decomposição.
        - Se for Tópico 2 (Sistema Decimal): Foco em valor posicional e trocas (unidade/dezena).
        - Se for Tópico 3/4 (Operações): Foco no significado (juntar, tirar, agrupar) e não na conta armada.
        - Se for Tópico 7 (Interpretação): Foco em identificar dados e a pergunta.
      `;
    } else {
      persona = "Você é o Professor Augusto César Morgado. Sua didática é baseada no livro 'Análise Combinatória e Probabilidade'.";
      constraints = `
        - FOCO: Raciocínio lógico e Princípio Fundamental da Contagem (PFC).
        - REGRAS: Nunca use fórmulas sem explicar a contagem por slots.
        - CONTEÚDO: Exclusivamente Matemática/Combinatória avançada. Proibido temas de Direito ou Concursos.
      `;
    }
  } else {
    persona = "Você é um especialista em Concursos Públicos de alto nível (Juiz, Auditor, Delegado).";
    constraints = `
      - FOCO: Questões reais de bancas examinadoras (FGV, CESPE/Cebraspe, FCC, Vunesp).
      - REGRAS: Você DEVE incluir o nome da banca no campo "banca".
      - CONTEÚDO: Exclusivamente o tópico de Direito ou Raciocínio Lógico solicitado.
      - ESTILO: Formal e técnico conforme a jurisprudência e doutrina dominante.
    `;
  }

  const modelName = (currentDifficulty === Difficulty.OLYMPIAD || currentDifficulty === Difficulty.ADVANCED) 
    ? MODEL_REASONING 
    : MODEL_FLASH;

  const prompt = `
    ${persona}
    
    Tópico: ${topicName} > ${subSkillName}.
    Dificuldade: ${currentDifficulty}.
    
    ${constraints}
    ${LATEX_INSTRUCTION}

    Retorne APENAS o JSON no esquema:
    {
      "text": "Enunciado da questão (contextualizado e claro)...",
      "options": ["A", "B", "C", "D", "E"],
      "correctAnswer": "A opção exata",
      "explanation": "Explicação passo a passo, focada na causa do erro e no conceito...",
      "hints": ["Dica conceitual 1", "Dica prática 2"],
      "miniTheory": "Breve explicação do conceito chave (sem decoreba)...",
      "banca": "Nome da Banca (apenas se for Concurso)",
      "visualization": { "type": "slots|circular|venn|urn|none", "data": {...}, "label": "..." }
    }
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            hints: { type: Type.ARRAY, items: { type: Type.STRING } },
            miniTheory: { type: Type.STRING },
            banca: { type: Type.STRING, nullable: true },
            source: { type: Type.STRING, nullable: true },
            visualization: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                data: { 
                  type: Type.OBJECT,
                  properties: {
                    count: { type: Type.NUMBER, nullable: true },
                    values: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                    items: { type: Type.NUMBER, nullable: true },
                    labels: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                    sets: { type: Type.NUMBER, nullable: true },
                    balls: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true }
                  }
                },
                label: { type: Type.STRING, nullable: true }
              },
              required: ['type']
            }
          },
          required: ["text", "options", "correctAnswer", "explanation", "hints", "miniTheory", "visualization"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    
    return {
      id: crypto.randomUUID(),
      topicId,
      subSkillId,
      subSkillName,
      difficulty: currentDifficulty as Difficulty,
      text: data.text,
      options: data.options,
      correctAnswer: data.correctAnswer,
      explanation: data.explanation,
      visualization: data.visualization,
      hints: data.hints || [],
      miniTheory: data.miniTheory,
      banca: data.banca,
      source: data.source
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      id: 'fallback',
      topicId,
      subSkillId,
      subSkillName,
      difficulty: Difficulty.BASIC,
      text: "Erro ao conectar com a IA. Verifique a chave de API.",
      options: ["-", "-", "-", "-"],
      correctAnswer: "-",
      explanation: "Verifique se a variável de ambiente API_KEY está configurada corretamente.",
      banca: "Sistema"
    };
  }
};

export const generatePlacementQuestions = async (category: 'math' | 'concursos', subCategory?: string): Promise<Question[]> => {
  let persona = "";
  let contentFilter = "";
  
  if (category === 'math') {
    if (subCategory === 'basic') {
      persona = "Especialista em Neuroeducação e Matemática Fundamental.";
      contentFilter = "Gere 4 questões de Diagnóstico Inicial (Tópico 0) cobrindo: Noção de Quantidade, Sistema Decimal (valor posicional) e Interpretação de problemas simples. O objetivo é identificar lacunas básicas.";
    } else {
      persona = "Professor Morgado (Matemática Discreta).";
      contentFilter = "Gere 4 questões de Análise Combinatória para nivelamento (PFC, Permutações simples e Lógica).";
    }
  } else {
    persona = "Especialista em Bancas de Concursos (FGV/CESPE).";
    contentFilter = "Gere 4 questões de Direito (Adm, Const, Penal) e Raciocínio Lógico de provas reais.";
  }

  const prompt = `
    Crie um Teste de Nivelamento (Diagnostic Test).
    Estilo: ${persona}.
    Conteúdo: ${contentFilter}
    
    ${category === 'concursos' ? 'Identifique a banca de cada questão.' : ''}
    ${LATEX_INSTRUCTION}
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  topicId: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  banca: { type: Type.STRING, nullable: true },
                  source: { type: Type.STRING, nullable: true }
                },
                required: ["text", "options", "correctAnswer", "topicId", "explanation"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });
    
    const text = response.text || '{"questions": []}';
    const data = JSON.parse(text);
    
    return data.questions.map((q: any, index: number) => ({
      ...q,
      id: `placement-${index}-${Date.now()}`,
      subSkillId: 'diagnostic',
      subSkillName: 'Diagnóstico Inicial',
      difficulty: Difficulty.INTERMEDIATE,
      hints: [],
      miniTheory: 'Fase de nivelamento.'
    }));
  } catch (e) {
    return [];
  }
}

export const generateSimulationQuestions = async (config: SimulationConfig, contextTopics?: string[]): Promise<Question[]> => {
  const { style, questionCount, difficulty } = config;
  
  // Constroi string de restrição de tópicos
  const topicRestriction = contextTopics && contextTopics.length > 0
    ? `RESTRIÇÃO DE CONTEÚDO: As questões DEVEM ser EXCLUSIVAMENTE sobre os seguintes tópicos: ${contextTopics.join(', ')}.`
    : '';

  let styleInstruction = "";
  if (style === 'Olympiad') {
    styleInstruction = `
      ATENÇÃO: Este é um simulado de NÍVEL OLÍMPICO INTERNACIONAL.
      
      REFERÊNCIAS OBRIGATÓRIAS:
      Utilize como inspiração questões de competições renomadas mundialmente, adaptadas para o nível dos tópicos solicitados.
      Exemplos de fontes:
      - Brasil: OBMEP (Nível 1/2), OBM.
      - Estados Unidos: AMC 8, AMC 10.
      - Rússia: Olimpíadas de Moscou, Torneio das Cidades (Nível iniciante).
      - Outros: Canguru Matemático, Olimpíadas da China, Hungria ou Índia.

      OBRIGATÓRIO:
      Para CADA questão, você DEVE especificar a fonte real (Nome da Olimpíada, Ano, País) no campo 'source'. 
      Exemplo: "OBMEP 2015 - Brasil" ou "AMC 8 2020 - EUA".

      CARACTERÍSTICAS DAS QUESTÕES:
      - Devem exigir 'sacadas' (insights) criativos e não apenas aplicação direta de fórmulas.
      - Foco em Lógica, Invariantes, Princípio da Casa dos Pombos, Paridade, e Geometria Intuitiva (visual).
      - Enunciados interessantes e desafiadores, típicos de cultura de resolução de problemas.
    `;
  } else if (style === 'Concurso') {
    styleInstruction = "Cite e emule o estilo de bancas como FGV, CESPE, Vunesp, Cesgranrio.";
  } else if (style === 'Military') {
    styleInstruction = "Nível IME/ITA/AFA. Questões de alta complexidade técnica.";
  }

  const prompt = `
    Gere um SIMULADO de ${questionCount} questões no estilo ${style} nível ${difficulty}.
    ${styleInstruction}
    ${topicRestriction}
    
    Se for Concurso, cite bancas.
    Retorne JSON Array.
    ${LATEX_INSTRUCTION}
  `;
  
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
      model: MODEL_FLASH, 
      contents: prompt, 
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING },
              topicId: { type: Type.STRING },
              banca: { type: Type.STRING, nullable: true },
              source: { type: Type.STRING, nullable: true }
            }
          }
        }
      }
    });
    
    const questions = JSON.parse(response.text || '[]');
    return questions.map((q: any, index: number) => ({
      ...q,
      id: `sim-${Date.now()}-${index}`,
      subSkillId: 'simulation',
      subSkillName: `${style} Simulation`,
      difficulty: difficulty,
      hints: [],
      miniTheory: ''
    }));
  } catch (e) {
    return [];
  }
}

export const generateFlashcards = async (topicId: TopicId): Promise<Flashcard[]> => {
  const prompt = `Crie 4 Flashcards sobre o tópico ${topicId}. Retorne JSON Array [{front, back}].`;
  const ai = getAI();
  const response = await ai.models.generateContent({ 
    model: MODEL_FLASH, 
    contents: prompt, 
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING },
            back: { type: Type.STRING }
          }
        }
      }
    }
  });
  const data = JSON.parse(response.text || '[]');
  return data.map((card: any) => ({
    id: crypto.randomUUID(),
    topicId,
    front: card.front,
    back: card.back,
    srs: getInitialSRSState()
  }));
};

export const generateFeedbackReport = async (history: Interaction[], role: 'student' | 'teacher'): Promise<ReportData> => {
  const prompt = `Analise o histórico de estudo. Papel: ${role}. Avalie a proficiência. Retorne JSON {summary, strengths, weaknesses, recommendedFocus, knowledgeGraph}.`;
  const ai = getAI();
  const response = await ai.models.generateContent({ model: MODEL_FLASH, contents: prompt, config: { responseMimeType: "application/json" }});
  const data = JSON.parse(response.text || '{}');
  return {
    summary: data.summary || "Iniciando análise...",
    strengths: data.strengths || [],
    weaknesses: data.weaknesses || [],
    recommendedFocus: data.recommendedFocus || "Continue estudando.",
    role,
    knowledgeGraph: data.knowledgeGraph || { nodes: [], edges: [] }
  };
};

// --- NEW FUNCTIONS: Adaptive Study Path Generation ---

/**
 * Calcula a carga horária recomendada baseada no prazo e nas fraquezas
 */
export const calculateStudyEffort = async (
  weaknesses: string[],
  goalDescription: string,
  deadline: string,
  selectedTopics: string[] = []
): Promise<{ recommendedMinutes: number; reasoning: string }> => {
  
  const topicContext = selectedTopics.length > 0 
    ? `O plano cobrirá APENAS estes tópicos selecionados: ${selectedTopics.join(', ')}.`
    : '';

  const prompt = `
    Atue como um coordenador pedagógico.
    
    DADOS DO ALUNO:
    - Objetivo: ${goalDescription}
    - Prazo Final: ${deadline} (Hoje é: ${new Date().toISOString().split('T')[0]})
    - Lacunas Identificadas: ${weaknesses.length > 0 ? weaknesses.join(', ') : 'Nenhuma grave'}
    - ${topicContext}
    
    TAREFA:
    Calcule a quantidade IDEAL de minutos de estudo por dia para atingir a maestria NOS TÓPICOS SELECIONADOS até o prazo.
    Considere:
    1. O volume de conteúdo dos tópicos selecionados (${selectedTopics.length} tópicos).
    2. Se o prazo for curto e houver muitas lacunas, aumente o tempo.
    3. Mínimo razoável: 20 min (se poucos tópicos). Máximo razoável: 240 min.
    
    Retorne JSON:
    { "recommendedMinutes": number, "reasoning": "Texto curto justificando (ex: 'Para cobrir os 3 tópicos selecionados em 2 semanas...')" }
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedMinutes: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          },
          required: ['recommendedMinutes', 'reasoning']
        }
      }
    });
    
    const data = JSON.parse(response.text || '{}');
    return {
      recommendedMinutes: data.recommendedMinutes || 60,
      reasoning: data.reasoning || "Baseado na análise do seu perfil e prazo."
    };
  } catch (error) {
    return { recommendedMinutes: 60, reasoning: "Estimativa padrão devido a erro na análise." };
  }
};

export const generateStudyPath = async (
  weaknesses: string[], 
  goalDescription: string, 
  deadline: string, 
  dailyMinutes: number,
  selectedTopics: string[] = [],
  category?: 'math' | 'concursos'
): Promise<StudyWeek[]> => {
  
  // 1. Calculate the actual time available
  const now = new Date();
  const targetDate = new Date(deadline);
  const diffTime = Math.abs(targetDate.getTime() - now.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  const diffWeeks = Math.ceil(diffDays / 7);

  // Determine if we should plan by days (short term) or weeks (long term)
  const isShortTerm = diffWeeks < 2;
  const timeUnit = isShortTerm ? 'DIAS' : 'SEMANAS';
  const timeQuantity = isShortTerm ? diffDays : diffWeeks;

  // Create a Persona and Constraints based on the Category
  let personaInstruction = "";
  if (category === 'math') {
    personaInstruction = "Você é um Coordenador Pedagógico de Matemática e Exatas.";
    personaInstruction += " IMPORTANTE: Você está estritamente PROIBIDO de incluir tópicos de Direito, Leis ou Humanas. Foque APENAS em Matemática.";
  } else if (category === 'concursos') {
    personaInstruction = "Você é um Especialista em Concursos Públicos (Área Jurídica e Administrativa).";
    personaInstruction += " IMPORTANTE: Foque APENAS em tópicos de Direito, Legislação e Lógica para concursos. Não inclua matemática pura de escola.";
  } else {
    personaInstruction = "Você é um Coordenador Pedagógico Geral.";
  }

  const topicConstraint = selectedTopics.length > 0
    ? `RESTRIÇÃO CRÍTICA DE ESCOPO: O plano de estudos DEVE conter APENAS assuntos EXPLICITAMENTE LISTADOS AQUI: [${selectedTopics.join(', ')}]. NÃO INVENTE TÓPICOS NOVOS e NÃO INCLUA TÓPICOS DE OUTRAS MATÉRIAS.`
    : '';

  const prompt = `
    ${personaInstruction}
    
    DADOS DO ALUNO:
    - CONTEXTO ESPECÍFICO DO OBJETIVO: ${goalDescription}
    - Data Limite: ${deadline}
    - Tempo Diário Disponível: ${dailyMinutes} minutos
    - Lacunas Identificadas: ${weaknesses.length > 0 ? weaknesses.join(', ') : 'Nenhuma lacuna crítica'}

    DURAÇÃO DO PLANO:
    Você tem EXATAMENTE ${timeQuantity} ${timeUnit} até a prova.
    NÃO crie um plano genérico de 12 semanas se o prazo for diferente.
    Se a unidade for DIAS, o campo "weekNumber" no JSON representará o "Dia".
    Se a unidade for SEMANAS, o campo "weekNumber" representará a "Semana".

    ${topicConstraint}

    INSTRUÇÕES DE PLANEJAMENTO:
    1. Distribua APENAS os tópicos selecionados da lista acima ao longo das ${timeQuantity} ${timeUnit}.
    2. Se a lista de tópicos for pequena, aprofunde neles. Se for grande, priorize o básico.
    3. Gere EXATAMENTE ${timeQuantity} itens no array (nem mais, nem menos).
    
    Retorne JSON Array de Semanas/Dias no seguinte schema:
    [{ "weekNumber": 1, "theme": "Tema Central", "topicsToStudy": ["Tópico 1", "Tópico 2"], "focusArea": "Fixation" | "Practice" | "Revision" | "Advanced" }]
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              weekNumber: { type: Type.INTEGER },
              theme: { type: Type.STRING },
              topicsToStudy: { type: Type.ARRAY, items: { type: Type.STRING } },
              focusArea: { type: Type.STRING, enum: ['Fixation', 'Practice', 'Revision', 'Advanced'] }
            },
            required: ['weekNumber', 'theme', 'topicsToStudy', 'focusArea']
          }
        }
      }
    });

    const weeks = JSON.parse(response.text || '[]');
    return weeks;
  } catch (error) {
    console.error("Error generating study plan:", error);
    return [];
  }
};
