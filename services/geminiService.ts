import { GoogleGenAI, Type } from "@google/genai";
import { Question, Difficulty, TopicId, Interaction, ReportData, TheoryContent, SimulationConfig } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FLASH = 'gemini-3-flash-preview';
const MODEL_REASONING = 'gemini-3-pro-preview';

// --- Theory Generation (Legacy - maintained for detailed review if needed) ---

export const generateTheory = async (
  topicName: string,
  subSkillName: string,
  difficulty: string
): Promise<TheoryContent> => {
  const prompt = `
    Atue como um professor de matemática especialista em olimpíadas.
    Fonte: Livro do Morgado (Análise Combinatória e Probabilidade).
    Tópico: "${subSkillName}" (dentro de ${topicName}).
    
    Gere uma explicação teórica CURTA e OBJETIVA.
    Use LaTeX ($...$) para fórmulas.
    
    JSON Output: { title, content, example, visualization }
  `;
  try {
     const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { return { title: 'Erro', content: '...', example: '...' }; }
};

// --- Problem Generation (With Just-in-Time Theory) ---

export const generateProblem = async (
  topicName: string,
  topicId: TopicId,
  subSkillId: string,
  subSkillName: string,
  currentDifficulty: string
): Promise<Question> => {
  
  const modelName = (currentDifficulty === Difficulty.OLYMPIAD || currentDifficulty === Difficulty.ADVANCED) 
    ? MODEL_REASONING 
    : MODEL_FLASH;

  const prompt = `
    Crie um problema de Análise Combinatória.
    Fonte: Livro do Morgado.
    
    Tópico: ${topicName} > ${subSkillName}.
    Dificuldade: ${currentDifficulty}.
    
    REQUISITOS ESPECIAIS (JUST-IN-TIME LEARNING):
    1. O aluno receberá apenas a questão.
    2. Ele pode pedir "Dicas" ou "Teoria Rápida" se travar.
    3. Gere 2 dicas progressivas (sem dar a resposta).
    4. Gere uma "miniTheory": Um parágrafo curto (max 3 linhas) explicando O CONCEITO CHAVE necessário para resolver ESTA questão específica. Não dê uma aula inteira, apenas a ferramenta necessária.

    FORMATAÇÃO:
    - Use LaTeX ($...$) para matemática.
    
    VISUALIZAÇÃO:
    - 'slots': Princípio multiplicativo, placas, senhas.
    - 'circular': Mesa redonda, colar.
    - 'venn': Conjuntos.
    - 'urn': Bolas, sorteio.
    - 'none': Outros.

    Estruture JSON:
    {
      "text": "Enunciado...",
      "options": ["A", "B", "C", "D"] (null se Advanced/Olympiad),
      "correctAnswer": "Resposta final",
      "explanation": "Resolução completa",
      "hints": ["Dica 1...", "Dica 2..."],
      "miniTheory": "Resumo do conceito chave...",
      "visualization": { "type": "...", "data": {...}, "label": "..." }
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
            options: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            hints: { type: Type.ARRAY, items: { type: Type.STRING } },
            miniTheory: { type: Type.STRING },
            visualization: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['slots', 'circular', 'venn', 'urn', 'graph', 'none'] },
                data: { 
                  type: Type.OBJECT,
                  properties: {
                    count: { type: Type.NUMBER, nullable: true },
                    values: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                    items: { type: Type.NUMBER, nullable: true },
                    labels: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                    sets: { type: Type.NUMBER, nullable: true },
                    balls: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true }
                  },
                  nullable: true
                },
                label: { type: Type.STRING, nullable: true }
              },
              required: ['type']
            }
          },
          required: ["text", "correctAnswer", "explanation", "hints", "miniTheory"]
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
      hints: data.hints || [], // Ensure array
      miniTheory: data.miniTheory
    };

  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      id: 'fallback',
      topicId,
      subSkillId,
      subSkillName,
      difficulty: Difficulty.BASIC,
      text: `Erro na IA. Resolva: 3!`,
      options: ['3', '6', '9', '12'],
      correctAnswer: '6',
      explanation: '3! = 6',
      miniTheory: 'Fatorial de n é o produto de 1 até n.',
      hints: ['Multiplique 3 * 2 * 1']
    };
  }
};

// --- Placement Test Generation ---

export const generatePlacementQuestions = async (): Promise<Question[]> => {
  const prompt = `
    Crie um Teste de Nivelamento (Diagnostic Test) de Análise Combinatória.
    Gere 3 questões cobrindo níveis diferentes para identificar a proficiência do aluno.
    
    1. Questão Básica: Princípio Fundamental da Contagem (PFC).
    2. Questão Intermediária: Combinação Simples vs Arranjo.
    3. Questão Avançada: Permutação com Repetição ou Circular.
    
    Retorne um ARRAY JSON com 3 objetos de questão completos (text, options, correctAnswer, topicId correspondente).
    Para 'topicId', use: 'intro_counting', 'combinations', ou 'permutations'.
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
               topicId: { type: Type.STRING }
             },
             required: ['text', 'options', 'correctAnswer', 'topicId']
          }
        }
      }
    });
    
    const questions = JSON.parse(response.text || '[]');
    if (!Array.isArray(questions)) return []; // Safety check
    
    return questions.map((q: any, index: number) => ({
      ...q,
      id: `placement-${index}`,
      subSkillId: 'diagnostic',
      subSkillName: 'Diagnóstico',
      difficulty: Difficulty.INTERMEDIATE, // Standard for placement
      hints: [],
      miniTheory: ''
    }));

  } catch (e) {
    console.error(e);
    return [];
  }
}

// --- Simulation Generation ---

export const generateSimulationQuestions = async (config: SimulationConfig): Promise<Question[]> => {
  const { style, questionCount, difficulty } = config;

  let stylePrompt = '';
  switch(style) {
    case 'Concurso': stylePrompt = 'Estilo Concursos Públicos (FGV, Cesgranrio, Cebraspe). Enunciados contextualizados, foco em PFC e Combinações.'; break;
    case 'Olympiad': stylePrompt = 'Estilo Olimpíadas de Matemática (OBMEP Nível 2/3, OBM). Questões criativas que exigem raciocínio lógico profundo, não apenas fórmulas.'; break;
    case 'Military': stylePrompt = 'Estilo Militar de Alta Dificuldade (ITA, IME, AFA, EN). Questões complexas, técnicas avançadas (Lemas de Kaplansky, Inclusão-Exclusão, Funções Geradoras se necessário).'; break;
    default: stylePrompt = 'Estilo Ensino Médio/ENEM. Aplicação direta de conceitos.';
  }

  const prompt = `
    Gere um SIMULADO de Análise Combinatória contendo ${questionCount} questões.
    ESTILO: ${stylePrompt}
    DIFICULDADE: ${difficulty}.
    
    As questões devem ser variadas dentro da Análise Combinatória.
    Retorne um ARRAY JSON de objetos. Cada objeto deve conter 'text', 'options' (5 opções A-E), 'correctAnswer' (apenas a letra ou valor), 'explanation', e um 'topicId' aproximado.
  `;

  const model = style === 'Military' || style === 'Olympiad' ? MODEL_REASONING : MODEL_FLASH;

  try {
    const response = await ai.models.generateContent({
      model: model,
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
               topicId: { type: Type.STRING }
             },
             required: ['text', 'options', 'correctAnswer', 'topicId']
          }
        }
      }
    });
    
    const questions = JSON.parse(response.text || '[]');
    if (!Array.isArray(questions)) return [];

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
    console.error(e);
    return [];
  }
}


// --- Reports ---

export const generateFeedbackReport = async (
  history: Interaction[],
  role: 'student' | 'teacher'
): Promise<ReportData> => {
  const emptyReport: ReportData = {
    summary: "Ainda não há dados suficientes.",
    strengths: [],
    weaknesses: [],
    recommendedFocus: "Pratique mais.",
    role,
    knowledgeGraph: { nodes: [], edges: [] }
  };

  if (history.length === 0) return emptyReport;
  
  const historyStr = history.slice(-20).map(h => 
    `[${h.difficulty}] ${h.topicId}: ${h.isCorrect ? 'Acertou' : 'Errou'}`
  ).join('\n');

  const prompt = `Analise este histórico (Morgado). Papel: ${role}. Retorne JSON {summary, strengths, weaknesses, recommendedFocus, knowledgeGraph}.`;
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_FLASH, contents: prompt, config: { responseMimeType: "application/json" } 
    });
    
    const data = JSON.parse(response.text || '{}');
    
    // Safety sanitization
    return {
      summary: data.summary || "Sem resumo disponível.",
      strengths: Array.isArray(data.strengths) ? data.strengths : [],
      weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
      recommendedFocus: data.recommendedFocus || "Continuar praticando.",
      role,
      knowledgeGraph: {
        nodes: Array.isArray(data.knowledgeGraph?.nodes) ? data.knowledgeGraph.nodes : [],
        edges: Array.isArray(data.knowledgeGraph?.edges) ? data.knowledgeGraph.edges : []
      }
    };
  } catch(e) { 
    return emptyReport; 
  }
};