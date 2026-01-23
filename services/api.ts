import { Question, UserProgress, Interaction } from '../types';
import { auth } from './firebase';

// URL do seu Backend hospedado na Hostinger
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Helper para adicionar o Token de Autenticação do Firebase nos headers
 */
const getAuthHeaders = async () => {
  const user = auth?.currentUser;
  const token = user ? await user.getIdToken() : '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const api = {
  // --- QUESTÕES (MySQL) ---
  
  /**
   * Busca uma questão no MySQL baseada nos filtros.
   */
  async getQuestion(params: {
    topicId: string;
    subSkillId: string;
    difficulty: string;
    category: string;
  }): Promise<Question | null> {
    try {
      const query = new URLSearchParams(params).toString();
      // O PHP espera /questions/recommend?topicId=...
      const response = await fetch(`${API_BASE_URL}/questions/recommend?${query}`, {
        method: 'GET',
        headers: await getAuthHeaders()
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('API Error fetching question:', error);
      return null;
    }
  },

  /**
   * Salva uma nova questão gerada pela IA no MySQL.
   */
  async createQuestion(question: Question, category: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/questions`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ ...question, category })
      });
      return response.ok;
    } catch (error) {
      console.error('API Error saving question:', error);
      return false;
    }
  },

  // --- PROGRESSO & BKT (MySQL) ---

  /**
   * Envia uma interação (acerto/erro) para o Backend.
   */
  async sendInteraction(interaction: Interaction): Promise<void> {
    try {
      // O PHP recebe, mas o frontend React gerencia o estado BKT localmente por enquanto
      // Enviamos apenas para log
      await fetch(`${API_BASE_URL}/progress/interaction`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(interaction)
      });
    } catch (error) {
      console.error('API Error sending interaction:', error);
    }
  },

  /**
   * Sincroniza o estado completo do usuário.
   */
  async syncProgress(userId: string, progress: UserProgress): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/progress/${userId}`, {
        method: 'PUT',
        headers: await getAuthHeaders(),
        body: JSON.stringify(progress)
      });
    } catch (error) {
      console.error('API Error syncing progress:', error);
    }
  },

  /**
   * Carrega o progresso do usuário do MySQL.
   */
  async loadProgress(userId: string): Promise<UserProgress | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/progress/${userId}`, {
        method: 'GET',
        headers: await getAuthHeaders()
      });
      
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('API Error loading progress:', error);
      return null;
    }
  }
};