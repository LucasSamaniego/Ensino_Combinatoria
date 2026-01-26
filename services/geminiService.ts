
import { GoogleGenAI, Type } from "@google/genai";
import { Question, Difficulty, TopicId, Interaction, ReportData, TheoryContent, SimulationConfig, Flashcard, StudyPlan, StudyWeek } from '../types';
import { getInitialSRSState } from './srsService';
import { CONCURSOS_TOPICS } from '../constants';

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
  currentDifficulty: string,
  contextInfo?: string // Novo parâmetro para passar as bancas selecionadas
): Promise<Question> => {
  
  let persona = "";
  let constraints = "";
  let visualInstruction = "";
  let toolsConfig = undefined; // Configuração de ferramentas (Search)
  
  // Verificação se é Matemática Básica (Módulos 0-7)
  const isBasicMath = topicId.startsWith('math_basics_');

  if (category === 'math') {
    // --- Lógica para Matemática (Geração Didática) ---
    if (isBasicMath) {
      persona = "Você é um especialista em educação matemática, neuroeducação e design instrucional, focado em realfabetização matemática.";
      constraints = `
        SIGA RIGOROSAMENTE AS SEGUINTES REGRAS DE DESIGN INSTRUCIONAL:
        1. **Objetivo**: Realfabetização matemática. Priorize compreensão conceitual antes de algoritmos.
        2. **Linguagem**: Simples, concreta, acessível e motivadora. Evite punição ou tecnicismo excessivo.
        3. **Contexto**: Use exemplos do cotidiano (dinheiro, objetos, situações reais).
        4. **Classificação de Erro**: O campo "explanation" deve fornecer feedback explicativo baseado na causa do erro.
        5. **Proibido**: Atalhos algorítmicos sem explicação conceitual prévia.
        6. **FIREWALL**: PROIBIDO gerar questões sobre Direito, Leis, Artigos da Constituição ou contexto de Concurso Público.
      `;
    } else {
      persona = "Você é o Professor Augusto César Morgado. Sua didática é baseada no livro 'Análise Combinatória e Probabilidade'.";
      constraints = `
        - FOCO: Raciocínio lógico e Princípio Fundamental da Contagem (PFC).
        - REGRAS: Nunca use fórmulas sem explicar a contagem por slots.
        - **FIREWALL**: PROIBIDO gerar questões sobre Leis, Crimes ou Administração Pública. Foque puramente na Matemática Discreta acadêmica.
      `;
    }
    
    visualInstruction = `
      INSTRUÇÃO DE MÍDIA:
      NÃO gere imagens (bits). O campo "visualization" deve ser estritamente: { "type": "none" }.
    `;

  } else {
    // --- Lógica para Concursos (SEARCH ENGINE MODE) ---
    // Habilita Google Search para encontrar a questão real na web
    toolsConfig = [{ googleSearch: {} }];

    persona = "ATUE COMO UM MOTOR DE BUSCA ESPECIALIZADO EM PROVAS E CONCURSOS PÚBLICOS.";
    
    const contextUpper = contextInfo ? contextInfo.toUpperCase() : "";
    const hasSpecificBoards = contextInfo && (contextInfo.includes("BANCAS:") || contextInfo.includes("Foco"));
    const isCebraspe = contextUpper.includes("CEBRASPE") || contextUpper.includes("CESPE");
    
    let boardInstruction = "";
    
    if (hasSpecificBoards) {
        boardInstruction = `
        PROTOCOLOS DE BUSCA (PRIORIDADE MÁXIMA):
        1. O usuário definiu um filtro EXCLUSIVO: ${contextInfo}.
        2. UTILIZE O GOOGLE SEARCH AGORA para encontrar uma questão REAL da banca solicitada.
        3. Busque por termos como: "Questão [Banca] [Assunto] [Ano]".
        4. É ESTRITAMENTE PROIBIDO inventar a questão. Se o Search retornar uma questão real, use-a palavra por palavra.
        5. Se o usuário pediu "FGV", e você retornar "Cebraspe", isso será considerado ERRO CRÍTICO.
        `;

        if (isCebraspe) {
          boardInstruction += `
          \nPROTOCOLO ESPECIAL CEBRASPE/CESPE:
          - Ao buscar, verifique se a questão é do tipo "Certo/Errado" (Julgue o Item).
          - SE a questão original encontrada for de "Certo ou Errado", o campo "options" deve ser ESTRITAMENTE: ["Certo", "Errado"].
          - O campo "correctAnswer" deve ser "Certo" ou "Errado".
          `;
        }
    } else {
        boardInstruction = "Utilize o Google Search para encontrar questões de bancas renomadas (FGV, Cebraspe, Vunesp, FCC).";
    }

    constraints = `
      ALERTA MÁXIMO: MODO DE CÓPIA FIEL (VERBATIM) VIA BUSCA.
      
      SUA MISSÃO:
      1.  PESQUISE na web uma questão que caiu em prova recentemente (2022-2024).
      2.  ${boardInstruction}
      3.  Tópico Alvo: ${topicName} > ${subSkillName}.
      4.  COPIE O ENUNCIADO EXATAMENTE como encontrado no resultado da busca.
      5.  COPIE AS ALTERNATIVAS EXATAMENTE como encontradas.
      
      REGRAS DE METADADOS:
      - 'banca': Nome da banca encontrada na busca.
      - 'source': Órgão, Cargo e Ano encontrados na busca.
    `;

    visualInstruction = `
      O campo "visualization" deve ser sempre: { "type": "none" }.
    `;
  }

  const modelName = (currentDifficulty === Difficulty.OLYMPIAD || currentDifficulty === Difficulty.ADVANCED) 
    ? MODEL_REASONING 
    : MODEL_FLASH;

  const prompt = `
    ${persona}
    
    Tópico Solicitado: ${topicName} > ${subSkillName}.
    Nível de Dificuldade da Prova: ${currentDifficulty}.
    
    ${constraints}
    ${visualInstruction}
    ${LATEX_INSTRUCTION}

    Retorne APENAS o JSON no esquema:
    {
      "text": "Enunciado da questão (COPIADO DA PROVA)...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."] OU ["Certo", "Errado"],
      "correctAnswer": "Texto da alternativa correta (ou 'Certo'/'Errado')",
      "explanation": "Gabarito comentado citando a lei, jurisprudência ou lógica da banca...",
      "hints": ["Dica sobre o estilo da banca", "Dica teórica"],
      "miniTheory": "Resumo do conceito (ex: Artigo da lei cobrado)...",
      "banca": "NOME DA BANCA",
      "source": "Órgão - Ano",
      "visualization": { "type": "none" }
    }
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: toolsConfig, // Injeta o Google Search se for Concursos
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
                type: { type: Type.STRING, enum: ['none'] }
              },
              required: ['type']
            }
          },
          required: ["text", "options", "correctAnswer", "explanation", "hints", "miniTheory", "visualization"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    
    // Log para debug de Search Grounding (Opcional, mas útil)
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
       console.log("Fontes encontradas:", response.candidates[0].groundingMetadata.groundingChunks);
    }
    
    const safeViz = data.visualization && data.visualization.type === 'none' 
      ? data.visualization 
      : { type: 'none' };

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
      visualization: safeViz,
      hints: data.hints || [],
      miniTheory: data.miniTheory,
      banca: data.banca || "Questão de Concurso",
      source: data.source || "Arquivo Público"
    };
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

export const generatePlacementQuestions = async (category: 'math' | 'concursos', subCategory?: string): Promise<Question[]> => {
  // Mantida lógica original do placement
  let persona = "";
  let contentFilter = "";
  let toolsConfig = undefined;
  
  if (category === 'math') {
    if (subCategory === 'basic') {
      persona = "Especialista em Neuroeducação e Matemática Fundamental.";
      contentFilter = "Gere 4 questões de Diagnóstico Inicial (Tópico 0) cobrindo: Noção de Quantidade, Sistema Decimal (valor posicional) e Interpretação de problemas simples. O objetivo é identificar lacunas básicas.";
    } else {
      persona = "Professor Morgado (Matemática Discreta).";
      contentFilter = "Gere 4 questões de Análise Combinatória para nivelamento (PFC, Permutações simples e Lógica).";
    }
  } else {
    // Enable Search for Placement as well to get real questions
    toolsConfig = [{ googleSearch: {} }];
    persona = "ATUE COMO UM MOTOR DE BUSCA DE QUESTÕES REAIS.";
    contentFilter = `
      PESQUISE e RETORNE 4 questões REAIS (CÓPIA FIEL) de concursos públicos recentes (2023-2024).
      - 1 de Direito Administrativo (Banca FGV).
      - 1 de Direito Constitucional (Banca Cebraspe - Estilo Certo/Errado).
      - 1 de Direito Penal (Banca Vunesp).
      - 1 de Raciocínio Lógico (Banca FCC).
      OBRIGATÓRIO: Preencha 'banca' e 'source' (ex: TJ-SP 2023).
      Para Cebraspe, as opções devem ser ["Certo", "Errado"].
    `;
  }

  const prompt = `
    Crie um Teste de Nivelamento (Diagnostic Test).
    Estilo: ${persona}.
    Conteúdo: ${contentFilter}
    
    ${LATEX_INSTRUCTION}
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
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
    ? `RESTRIÇÃO DE CONTEÚDO: As questões DEVEM ser EXCLUSIVAMENTE sobre os seguintes tópicos: ${contextTopics.join(', ')}.`
    : '';

  let styleInstruction = "";
  let toolsConfig = undefined;

  if (style === 'Olympiad') {
    styleInstruction = `
      ATENÇÃO: Este é um simulado de NÍVEL OLÍMPICO INTERNACIONAL.
      REFERÊNCIAS OBRIGATÓRIAS: OBMEP, OBM, AMC 8/10, Canguru.
      OBRIGATÓRIO: Citar a fonte real no campo 'source'.
    `;
  } else if (style === 'Concurso') {
    toolsConfig = [{ googleSearch: {} }];
    styleInstruction = `
      ATUE COMO UM MOTOR DE BUSCA.
      USE O GOOGLE SEARCH para encontrar ${questionCount} questões REAIS.
      
      Bancas preferenciais: FGV, CEBRASPE, FCC, VUNESP, CESGRANRIO.
      
      CEBRASPE/CESPE INSTRUCTION:
      - Se o Search encontrar questões do CEBRASPE, mantenha o formato ["Certo", "Errado"].
      
      MANDATÓRIO: Copie o texto exato encontrado na busca. Preencha 'banca' e 'source'.
    `;
  } else if (style === 'Military') {
    styleInstruction = "Nível IME/ITA/AFA. Questões de alta complexidade técnica. Cite o ano da prova.";
  }

  const prompt = `
    Gere um SIMULADO de ATÉ ${questionCount} questões no estilo ${style} nível ${difficulty}.
    ${styleInstruction}
    ${topicRestriction}
    
    Retorne JSON Array.
    ${LATEX_INSTRUCTION}
  `;
  
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
      model: MODEL_FLASH, 
      contents: prompt, 
      config: { 
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

/**
 * NEW: Analyzes an uploaded syllabus (PDF/Text) and maps it to our topic list.
 */
export const analyzeSyllabus = async (
  base64Data: string, 
  mimeType: string
): Promise<{ matchedTopics: string[], summary: string }> => {
  
  const knownTopicsList = CONCURSOS_TOPICS.map(t => t.name).join(", ");

  const prompt = `
    ATUE COMO UM ESPECIALISTA EM ANÁLISE DE EDITAIS DE CONCURSO.
    
    TAREFA:
    1. Analise o arquivo do edital fornecido (pode ser PDF ou Imagem).
    2. Identifique os tópicos cobrados que correspondem à nossa lista de matérias disponíveis: [${knownTopicsList}].
    3. Retorne uma lista APENAS com os nomes exatos da nossa lista que foram encontrados no edital.
    4. Gere um breve resumo (3 linhas) sobre o foco do edital (ex: "Foco pesado em legislação especial e atos administrativos").
    
    Retorne JSON:
    {
      "matchedTopics": ["Tópico A", "Tópico B"],
      "summary": "Resumo da análise..."
    }
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL_FLASH, // Gemini Flash supports multimodal (PDF/Images)
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        { text: prompt }
      ],
      config: {
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
      summary: data.summary || "Edital analisado, mas nenhum tópico padrão foi identificado com certeza."
    };
  } catch (error) {
    console.error("Error analyzing syllabus:", error);
    return { matchedTopics: [], summary: "Erro ao processar o arquivo. Tente um formato de texto ou imagem mais claro." };
  }
};

// --- NEW FUNCTIONS: Adaptive Study Path Generation ---

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
  category?: 'math' | 'concursos',
  syllabusContext?: string // Passed from the updated StudyPlanSetup
): Promise<StudyWeek[]> => {
  
  // 1. Calculate the actual time available
  const now = new Date();
  const targetDate = new Date(deadline);
  const diffTime = Math.abs(targetDate.getTime() - now.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  const diffWeeks = Math.ceil(diffDays / 7);

  const isShortTerm = diffWeeks < 2;
  const timeUnit = isShortTerm ? 'DIAS' : 'SEMANAS';
  const timeQuantity = isShortTerm ? diffDays : diffWeeks;

  let personaInstruction = "";
  if (category === 'math') {
    personaInstruction = "Você é um Coordenador Pedagógico de Matemática e Exatas. PROIBIDO incluir Direito/Leis ou tópicos de Concurso Público (exceto se for Matemática pura).";
  } else if (category === 'concursos') {
    personaInstruction = "Você é um Especialista em Concursos Públicos. Foque estritamente no Edital: Leis, Jurisprudência e Raciocínio Lógico Matemático (RLM) de Bancas. PROIBIDO incluir tópicos de matemática escolar básica que não caem em concurso.";
  } else {
    personaInstruction = "Você é um Coordenador Pedagógico Geral.";
  }

  const topicConstraint = selectedTopics.length > 0
    ? `RESTRIÇÃO CRÍTICA DE ESCOPO: O plano de estudos DEVE conter APENAS assuntos EXPLICITAMENTE LISTADOS AQUI: [${selectedTopics.join(', ')}]. NÃO INVENTE TÓPICOS NOVOS.`
    : '';

  const syllabusInstruction = syllabusContext 
    ? `CONTEXTO DO EDITAL (MUITO IMPORTANTE): O usuário fez upload do edital. O resumo da análise é: "${syllabusContext}". Use isso para priorizar o que realmente cai.`
    : '';

  const prompt = `
    ${personaInstruction}
    
    DADOS DO ALUNO:
    - CONTEXTO ESPECÍFICO DO OBJETIVO: ${goalDescription}
    - Data Limite: ${deadline}
    - Tempo Diário Disponível: ${dailyMinutes} minutos
    - Lacunas Identificadas: ${weaknesses.length > 0 ? weaknesses.join(', ') : 'Nenhuma lacuna crítica'}
    
    ${syllabusInstruction}

    DURAÇÃO DO PLANO:
    Você tem EXATAMENTE ${timeQuantity} ${timeUnit} até a prova.
    
    ${topicConstraint}

    INSTRUÇÕES DE PLANEJAMENTO:
    1. Distribua APENAS os tópicos selecionados da lista acima ao longo das ${timeQuantity} ${timeUnit}.
    2. Se a lista de tópicos for pequena, aprofunde neles. Se for grande, priorize o básico.
    3. Gere EXATAMENTE ${timeQuantity} itens no array.
    
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
