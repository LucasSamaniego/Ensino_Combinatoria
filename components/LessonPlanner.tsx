
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Loader2, BookOpen, Send } from 'lucide-react';
import MathRenderer from './MathRenderer';

const LessonPlanner: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [lesson, setLesson] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastGeneratedTopic, setLastGeneratedTopic] = useState('');

  const generateLesson = async () => {
    if (!topic) return;
    
    // Optimization: Don't regenerate if topic hasn't changed
    if (topic === lastGeneratedTopic && lesson) {
      return;
    }

    setLoading(true);
    // Use process.env.API_KEY as per Google GenAI guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `
          Gere um roteiro de aula para o tópico: "${topic}".
          Estrutura:
          1. Gancho inicial (Exemplo do dia a dia).
          2. Conceito principal com LaTeX ($...$).
          3. Exemplo resolvido passo a passo.
          4. Desafio "Provocativo" para os alunos.
          Use português do Brasil e tom inspirador.
        `,
        config: {
          systemInstruction: "Atue como um professor de matemática PhD. Seja didático e breve."
        }
      });
      // Garantir que não passamos undefined para o estado que espera string | null
      setLesson(response.text || "Não foi possível gerar o conteúdo da aula.");
      setLastGeneratedTopic(topic);
    } catch (e) {
      setLesson("Erro ao gerar roteiro. Verifique se a API_KEY está configurada.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow p-8 bg-slate-900 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-500 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Assistente de Conteúdo IA</h3>
              <p className="text-slate-400 text-sm">Gere explicações e roteiros criativos para suas aulas.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <input 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Por que 0! é igual a 1?"
              className="flex-grow bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            />
            <button 
              onClick={generateLesson}
              disabled={loading || !topic}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Gerar
            </button>
          </div>
        </div>

        {lesson && (
          <div className="bg-white rounded-2xl p-8 shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 mb-6 text-amber-600">
               <BookOpen className="w-5 h-5" />
               <span className="font-bold uppercase text-xs tracking-widest">Roteiro Sugerido</span>
            </div>
            <div className="prose prose-slate max-w-none">
               <MathRenderer text={lesson} className="text-slate-800" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonPlanner;
