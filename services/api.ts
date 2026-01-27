
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
  // --- EMAILS & NOTIFICATIONS ---

  /**
   * Envia email de boas-vindas para novos alunos.
   */
  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    try {
      const emailContent = `
        Olá ${name}, bem-vindo à Plataforma de Estudos Adaptativa!
        
        Como funciona:
        1. Teste de Nivelamento: Identificamos suas lacunas.
        2. IA Generativa: Criamos exercícios personalizados.
        3. Revisão Espaçada: Garantimos que você não esqueça o que aprendeu.
        
        Bons estudos!
      `;

      // Se houver backend configurado, envia a requisição real
      if (process.env.VITE_API_URL) {
        await fetch(`${API_BASE_URL}/email/welcome`, {
          method: 'POST',
          headers: await getAuthHeaders(),
          body: JSON.stringify({ email, name, content: emailContent })
        });
      } else {
        // Simulação para ambiente sem backend de email configurado
        console.log(`[EMAIL MOCK] Enviando para ${email}:\n${emailContent}`);
      }
      return true;
    } catch (error) {
      console.error('API Error sending welcome email:', error);
      return false;
    }
  },

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
