
import { GoogleGenAI, Type } from "@google/genai";
import { Question, Difficulty, TopicId, Interaction, ReportData, TheoryContent, SimulationConfig, Flashcard, StudyPlan, StudyWeek } from '../types';
import { getInitialSRSState } from './srsService';
import { CONCURSOS_TOPICS } from '../constants';

// Lazy initialization to prevent crash on load if API key is missing
let aiInstance: GoogleGenAI | null = null;

// --- OPTIMIZATION: IN-MEMORY QUESTION BUFFER ---
// Armazena questões pré-carregadas para evitar chamadas de API repetitivas.
// Chave: `${topicId}-${difficulty}-${contextInfoHash}`
const questionBuffer: Record<string, Question[]> = {};

const getAI = () => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

// Optimization: Use Flash for almost everything to save cost/latency
const MODEL_FLASH = 'gemini-3-flash-preview'; 
// Optimization: Reserve Pro only for extremely complex tasks if needed, currently mapping all to Flash or specialized Logic
const MODEL_REASONING = 'gemini-3-flash-preview'; // Downgraded from Pro to Flash for cost optimization unless explicitly required

const LATEX_INSTRUCTION = `
    JSON RULES:
    - Escape backslashes: "\\\\times", "\\\\frac".
    - No markdown formatting in JSON values.
`;

export const generateProblem = async (
  category: 'math' | 'concursos' | 'portuguese',
  topicName: string,
  topicId: TopicId,
  subSkillId: string,
  subSkillName: string,
  currentDifficulty: string,
  contextInfo?: string
): Promise<Question> => {
  
  // 1. BUFFER CHECK
  // Cria uma chave única para o contexto atual
  const bufferKey = `${topicId}-${currentDifficulty}-${contextInfo || 'general'}`;
  
  if (questionBuffer[bufferKey] && questionBuffer[bufferKey].length > 0) {
    console.log(`[OPTIMIZATION] Serving question from BUFFER for ${bufferKey}. (Saved API Call)`);
    const cachedQ = questionBuffer[bufferKey].pop();
    if (cachedQ) return cachedQ;
  }

  // Se não houver no buffer, preparamos para gerar um LOTE (Batch)
  console.log(`[API] Fetching new batch for ${bufferKey}...`);

  let persona = "";
  let constraints = "";
  let toolsConfig = undefined;
  
  const isBasicMath = topicId.startsWith('math_basics_');

  // Optimization: Moved instruction logic to System Instruction variable where possible
  // to reduce per-turn input token overhead if caching is supported by model
  let systemInstructionText = "";

  if (category === 'math') {
    if (isBasicMath) {
      systemInstructionText = "Specialist in neuroeducation and math literacy. Focus on conceptual understanding, concrete examples, and encouraging feedback. No complex algorithms without explanation.";
    } else {
      systemInstructionText = "Professor Augusto César Morgado. Focus on Combinatorics, Logical Reasoning, and PFC slots method. Formal but clear.";
    }
    
    constraints = `
      CONTEXT: Generating questions for: ${topicName} > ${subSkillName}. Difficulty: ${currentDifficulty}.
      VISUALIZATION: The field "visualization" must be { "type": "none" }.
      FIREWALL: Math only. No laws/politics.
    `;

  } else if (category === 'portuguese') {
    systemInstructionText = "Professor Pasquale Cipro Neto. Specialist in Brazilian Portuguese Grammar, Text Interpretation, and Literature.";
    
    // Portuguese often needs text context, allow searching or creative generation
    toolsConfig = undefined; // For now, generation only unless we want to search texts
    
    constraints = `
      CONTEXT: Generating questions for: ${topicName} > ${subSkillName}. Difficulty: ${currentDifficulty}.
      STYLE: Vestibular/ENEM/Concurso style.
      REQUIREMENT: If the question requires a text, include a SHORT text (max 3 lines) in the question body or as a 'miniTheory'.
      VISUALIZATION: The field "visualization" must be { "type": "none" }.
    `;

  } else {
    // Concursos Logic
    toolsConfig = [{ googleSearch: {} }];
    systemInstructionText = "Search Engine specialized in Brazilian Civil Service Exams (Concursos Públicos). Strict adherence to real exam questions.";
    
    const contextUpper = contextInfo ? contextInfo.toUpperCase() : "";
    const bankMatch = contextInfo ? contextInfo.match(/FILTRO DE BANCAS: \[(.*?)\]/) : null;
    const extractedBanks = bankMatch ? bankMatch[1] : "";
    
    const hasSpecificBoards = !!extractedBanks || (contextInfo && (contextInfo.includes("BANCAS:") || contextInfo.includes("Foco")));
    let searchTerm = `Questão concurso ${topicName} ${extractedBanks} 2023 2024`;

    constraints = `
      TASK: Search and retrieve REAL exam questions.
      FILTER: ${hasSpecificBoards ? `Must be from boards: [${extractedBanks}]. Query: "${searchTerm}"` : "Major boards (FGV, Cebraspe, etc)."}
      VERBATIM: Copy exact text and options.
      METADATA: Fill 'banca' and 'source' (Year/Organ).
      CEBRASPE: If True/False, options must be ["Certo", "Errado"].
    `;
  }

  // OPTIMIZATION: Request 3 questions instead of 1 to fill the buffer
  const prompt = `
    ${constraints}
    ${LATEX_INSTRUCTION}

    GENERATE A BATCH OF 3 DISTINCT QUESTIONS.
    Return a JSON Object with a property "questions" containing an array of 3 question objects.
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        systemInstruction: systemInstructionText, // Using system instruction properly
        tools: toolsConfig,
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
                  explanation: { type: Type.STRING },
                  hints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  miniTheory: { type: Type.STRING },
                  banca: { type: Type.STRING, nullable: true },
                  source: { type: Type.STRING, nullable: true },
                  visualization: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING, enum: ['none'] }
                    },
                    required: ['type']
                  }
                },
                required: ["text", "options", "correctAnswer", "explanation", "hints", "miniTheory", "visualization"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const data = JSON.parse(response.text || '{ "questions": [] }');
    const batch = data.questions || [];

    if (batch.length === 0) throw new Error("No questions generated");

    // Process all questions in batch
    const processedBatch = batch.map((q: any) => ({
      id: crypto.randomUUID(),
      topicId,
      subSkillId,
      subSkillName,
      difficulty: currentDifficulty as Difficulty,
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      visualization: q.visualization || { type: 'none' },
      hints: q.hints || [],
      miniTheory: q.miniTheory,
      banca: q.banca || (category === 'concursos' ? "Questão de Concurso" : undefined),
      source: q.source || (category === 'concursos' ? "Arquivo Público" : undefined)
    }));

    // Return first question
    const firstQ = processedBatch[0];

    // Store remaining questions in buffer
    if (processedBatch.length > 1) {
      questionBuffer[bufferKey] = processedBatch.slice(1);
      console.log(`[OPTIMIZATION] Buffered ${processedBatch.length - 1} extra questions for ${bufferKey}`);
    }

    return firstQ;

  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      id: 'fallback',
      topicId,
      subSkillId,
      subSkillName,
      difficulty: Difficulty.BASIC,
      text: "Erro ao buscar questão no arquivo. Tente novamente.",
      options: ["-", "-", "-", "-"],
      correctAnswer: "-",
      explanation: "Verifique a conexão.",
      banca: "Sistema"
    };
  }
};

// ... (Other functions: generatePlacementQuestions, generateSimulationQuestions, generateFlashcards, generateFeedbackReport)

export const generatePlacementQuestions = async (category: 'math' | 'concursos' | 'portuguese', subCategory?: string): Promise<Question[]> => {
  let systemInstructionText = "You are an expert exam creator.";
  let contentFilter = "";
  let toolsConfig = undefined;
  
  if (category === 'math') {
    if (subCategory === 'basic') {
      systemInstructionText = "Expert in Neuroeducation and Basic Math.";
      contentFilter = "Generate 4 Diagnostic Questions (Topic 0): Number Sense, Decimal System, Interpretation. Goal: Identify basic gaps.";
    } else {
      systemInstructionText = "Professor Morgado. Combinatorics Expert.";
      contentFilter = "Generate 4 Combinatorics placement questions (PFC, Permutations, Logic).";
    }
  } else if (category === 'portuguese') {
    systemInstructionText = "Expert in Portuguese Language Assessment.";
    contentFilter = "Generate 4 Diagnostic Questions covering: Orthography, Basic Syntax, Text Comprehension.";
  } else {
    toolsConfig = [{ googleSearch: {} }];
    systemInstructionText = "Search Engine for Real Exams.";
    contentFilter = `
      Search and return 4 REAL questions (2023-2024):
      1. Administrative Law (FGV).
      2. Constitutional Law (Cebraspe True/False).
      3. Penal Law (Vunesp).
      4. Logical Reasoning (FCC).
      Require 'banca' and 'source'.
    `;
  }

  const prompt = `
    Task: Create a Diagnostic Test.
    Content: ${contentFilter}
    ${LATEX_INSTRUCTION}
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        systemInstruction: systemInstructionText,
        tools: toolsConfig,
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
  
  const topicRestriction = contextTopics && contextTopics.length > 0
    ? `RESTRICTION: Questions MUST be about: ${contextTopics.join(', ')}.`
    : '';

  let styleInstruction = "";
  let toolsConfig = undefined;

  if (style === 'Olympiad') {
    styleInstruction = "Level: INTERNATIONAL OLYMPIAD (IMO, OBMEP, AMC). Hard logical puzzles.";
  } else if (style === 'Concurso') {
    toolsConfig = [{ googleSearch: {} }];
    styleInstruction = "Level: Public Service Exams (FGV, Cebraspe). Use Google Search to find REAL questions.";
  } else if (style === 'Military') {
    styleInstruction = "Level: ITA/IME/AFA. Extremely hard technical math.";
  }

  const prompt = `
    Generate a SIMULATION of ${questionCount} questions.
    Style: ${style}. Difficulty: ${difficulty}.
    ${topicRestriction}
    ${LATEX_INSTRUCTION}
  `;
  
  const styleMap: Record<string, string> = {
    'School': 'Escolar',
    'Concurso': 'Concurso',
    'Olympiad': 'Olimpíada',
    'Military': 'Militar'
  };

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
      model: MODEL_FLASH, 
      contents: prompt, 
      config: { 
        systemInstruction: styleInstruction, // Optimization
        tools: toolsConfig,
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
      subSkillName: `Simulado ${styleMap[style] || style}`,
      difficulty: difficulty,
      hints: [],
      miniTheory: ''
    }));
  } catch (e) {
    return [];
  }
}

export const generateFlashcards = async (topicId: TopicId): Promise<Flashcard[]> => {
  const prompt = `Create 4 Flashcards for topic: ${topicId}.`;
  const ai = getAI();
  const response = await ai.models.generateContent({ 
    model: MODEL_FLASH, 
    contents: prompt, 
    config: { 
      systemInstruction: "You are a flashcard generator. Front: Question/Concept. Back: Answer/Definition (concise). Return JSON Array.",
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
  const prompt = `Analyze study history. Role: ${role}. JSON Output: summary, strengths, weaknesses, recommendedFocus, knowledgeGraph.`;
  const ai = getAI();
  const response = await ai.models.generateContent({ 
    model: MODEL_FLASH, 
    contents: prompt, 
    config: { responseMimeType: "application/json" }
  });
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

export const analyzeSyllabus = async (
  base64Data: string, 
  mimeType: string
): Promise<{ matchedTopics: string[], summary: string }> => {
  
  const knownTopicsList = CONCURSOS_TOPICS.map(t => t.name).join(", ");

  const prompt = `
    Analyze the attached syllabus file.
    Map content to strict list: [${knownTopicsList}].
    Rules:
    - "Raciocínio Lógico" -> Only Logic/Propositions.
    - "Matemática" -> Combinatorics/Probability.
    Return JSON { matchedTopics: [], summary: string }.
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL_FLASH, 
      contents: [
        { inlineData: { mimeType: mimeType, data: base64Data } },
        { text: prompt }
      ],
      config: {
        systemInstruction: "You are a Syllabus Analyzer. Be strict with topic mapping.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchedTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING }
          },
          required: ['matchedTopics', 'summary']
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    return {
      matchedTopics: data.matchedTopics || [],
      summary: data.summary || "Edital analisado."
    };
  } catch (error) {
    console.error("Error analyzing syllabus:", error);
    return { matchedTopics: [], summary: "Erro ao processar o arquivo. Tente um formato de texto ou imagem mais claro." };
  }
};

export const calculateStudyEffort = async (
  weaknesses: string[],
  goalDescription: string,
  deadline: string,
  selectedTopics: string[] = [],
  knownTopics: string[] = [] 
): Promise<{ recommendedMinutes: number; reasoning: string }> => {
  
  const prompt = `
    Student Goal: ${goalDescription}. Deadline: ${deadline}.
    Weaknesses: ${weaknesses.join(', ')}.
    Topics: ${selectedTopics.join(', ')}.
    Known Topics: ${knownTopics.join(', ')}.
    Calculate daily minutes (20-240). Return JSON { recommendedMinutes, reasoning }.
    IMPORTANT: The 'reasoning' field MUST BE IN PORTUGUESE (pt-BR).
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        systemInstruction: "You are a Pedagogical Coordinator. Be realistic with time estimates. Output strictly in Portuguese.",
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
  category?: 'math' | 'concursos' | 'portuguese',
  syllabusContext?: string, 
  knownTopics: string[] = [] 
): Promise<StudyWeek[]> => {
  
  // 1. Calculate the actual time available
  const now = new Date();
  const targetDate = new Date(deadline);
  const diffTime = Math.abs(targetDate.getTime() - now.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  const diffWeeks = Math.ceil(diffDays / 7);

  const isShortTerm = diffWeeks < 2;
  const timeUnit = isShortTerm ? 'DAYS' : 'WEEKS';
  const timeQuantity = isShortTerm ? diffDays : diffWeeks;

  let personaInstruction = "Coordinator.";
  if (category === 'math') personaInstruction = "Math Coordinator. No laws.";
  if (category === 'concursos') personaInstruction = "Public Exam Expert. Strict topic adherence.";
  if (category === 'portuguese') personaInstruction = "Portuguese Language Teacher. Focus on Grammar and Interpretation.";

  const prompt = `
    Generate Study Plan.
    Duration: ${timeQuantity} ${timeUnit}.
    Goal: ${goalDescription}.
    Topics: ${selectedTopics.join(', ')}.
    Known: ${knownTopics.join(', ')} (Review only).
    Syllabus Context: ${syllabusContext || 'None'}.
    
    RICH CONTENT REQUIREMENT (MUST BE IN PORTUGUESE):
    For each unit (week/day), provide:
    - 'description': Instruction on HOW to study this topic (methodology). EXPLICITLY IN PORTUGUESE.
    - 'readingResources': Array of 2 specific book chapters or articles. EXPLICITLY IN PORTUGUESE (e.g. "CF/88 Art. 5", "Morgado Cap. 2").
    - 'videoSuggestions': Array of 2 specific search terms for video lessons. EXPLICITLY IN PORTUGUESE (e.g. "Permutação com Repetição Ferretto").
    - 'practicalTips': One key tip. EXPLICITLY IN PORTUGUESE.

    Return JSON Array of weeks/days.
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        systemInstruction: personaInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              weekNumber: { type: Type.INTEGER },
              theme: { type: Type.STRING },
              topicsToStudy: { type: Type.ARRAY, items: { type: Type.STRING } },
              focusArea: { type: Type.STRING, enum: ['Fixation', 'Practice', 'Revision', 'Advanced'] },
              description: { type: Type.STRING },
              readingResources: { type: Type.ARRAY, items: { type: Type.STRING } },
              videoSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              practicalTips: { type: Type.STRING }
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
