
import { Question, Difficulty, TopicId } from "../types";
import { generateProblem } from "./geminiService";
import { api } from "./api";

/**
 * Busca uma questão apropriada via API (MySQL).
 * Se a API não retornar nada (banco vazio ou sem conexão), usa a IA (Gemini) como fallback.
 */
export const getSmartQuestion = async (
  category: 'math' | 'concursos',
  topicName: string,
  topicId: TopicId,
  subSkillId: string,
  subSkillName: string,
  difficulty: Difficulty,
  contextInfo?: string // Novo parâmetro
): Promise<Question> => {
  
  // 1. Tentar buscar da API (Backend -> MySQL)
  try {
    const dbQuestion = await api.getQuestion({
      category,
      topicId,
      subSkillId,
      difficulty
    });

    if (dbQuestion) {
      console.log("Questão recuperada do MySQL via API!");
      return dbQuestion;
    }
  } catch (e) {
    console.warn("Falha ao conectar com API de questões, usando fallback IA.");
  }

  // 2. Fallback: Se não encontrar no banco, gera com IA (ou busca no "arquivo" da IA)
  console.log("Questão não encontrada no MySQL. Buscando com IA (Mode: " + (category === 'concursos' ? 'Archive' : 'Gen') + ")...");
  return await generateProblem(category, topicName, topicId, subSkillId, subSkillName, difficulty, contextInfo);
};

/**
 * Envia a questão para a API salvar no MySQL.
 */
export const saveQuestionToLibrary = async (question: Question, category: 'math' | 'concursos') => {
  return await api.createQuestion(question, category);
};
