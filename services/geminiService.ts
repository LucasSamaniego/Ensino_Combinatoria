
import { GoogleGenAI, Type } from "@google/genai";
import { Question, Difficulty, TopicId, Interaction, ReportData, TheoryContent, SimulationConfig, Flashcard } from '../types';
import { getInitialSRSState } from './srsService';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
      banca: data.banca
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      id: 'fallback',
      topicId,
      subSkillId,
      subSkillName,
      difficulty: Difficulty.BASIC,
      text: "Erro ao gerar questão. Por favor, tente novamente.",
      options: ["-", "-", "-", "-"],
      correctAnswer: "-",
      explanation: "Erro técnico de conexão com a IA.",
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
                  banca: { type: Type.STRING, nullable: true }
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

  const prompt = `
    Gere um SIMULADO de ${questionCount} questões no estilo ${style} nível ${difficulty}.
    ${topicRestriction}
    Se for Concurso, cite bancas como FGV ou CESPE.
    Retorne JSON Array.
    ${LATEX_INSTRUCTION}
  `;
  
  try {
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
              banca: { type: Type.STRING, nullable: true }
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
