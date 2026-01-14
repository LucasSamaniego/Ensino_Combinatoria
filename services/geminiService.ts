
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
  
  if (category === 'math') {
    // Lógica diferenciada para Matemática Básica vs Combinatória Avançada
    if (topicId === TopicId.BASIC_ARITHMETIC) {
      persona = "Você é um especialista em Didática da Matemática Fundamental, focado em Neurociência da Aprendizagem.";
      constraints = `
        - OBJETIVO: Ensinar tabuada através de Padrões, Lógica e Macetes, NÃO decoreba pura.
        - ESTILO: Lúdico, encorajador e visual.
        - PROIBIDO: Usar a didática do Professor Morgado ou termos complexos de Análise Combinatória.
        - ESTRATÉGIAS OBRIGATÓRIAS:
          1. Use a propriedade comutativa (ex: 7x8 é igual a 8x7).
          2. Explique padrões visuais (ex: tabuada do 9 e a soma dos dígitos).
          3. Use decomposição (ex: 6x8 é 5x8 + 1x8).
        - VISUALIZAÇÃO: Se possível, use o tipo 'slots' para mostrar grupos ou 'none'.
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
      "text": "Enunciado da questão (foque no macete/estratégia se for Tabuada)...",
      "options": ["A", "B", "C", "D", "E"],
      "correctAnswer": "A opção exata",
      "explanation": "Resolução focada no 'como pensar'...",
      "hints": ["Dica estratégica 1", "Dica estratégica 2"],
      "miniTheory": "Breve explicação do padrão ou macete...",
      "banca": "Nome da Banca (ex: FGV 2024) - Obrigatorio se for concurso",
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
      persona = "Especialista em Ensino Fundamental e Aritmética.";
      contentFilter = "Gere 4 questões de Nivelamento focadas em: Tabuada, operações básicas, cálculo mental e padrões numéricos. O nível deve progredir do muito fácil ao médio.";
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
