import React, { useState, useEffect } from 'react';
import { Question, Interaction, TopicId, Difficulty } from '../types';
import { generatePlacementQuestions } from '../services/geminiService';
import MathRenderer from './MathRenderer';
import { Loader2, CheckCircle, ArrowRight } from 'lucide-react';

interface PlacementTestProps {
  onComplete: (results: Interaction[]) => void;
}

const PlacementTest: React.FC<PlacementTestProps> = ({ onComplete }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Interaction[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    loadTest();
  }, []);

  const loadTest = async () => {
    setLoading(true);
    const qs = await generatePlacementQuestions();
    setQuestions(qs || []);
    setLoading(false);
  };

  const handleAnswer = () => {
    if (!selectedOption) return;

    const currentQ = questions[currentIndex];
    const isCorrect = selectedOption === currentQ.correctAnswer;

    const interaction: Interaction = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      topicId: currentQ.topicId,
      subSkillId: 'diagnostic',
      isCorrect,
      timeSpentSeconds: 30, // Estimativa para diagnóstico
      difficulty: Difficulty.INTERMEDIATE
    };

    const newResults = [...results, interaction];
    setResults(newResults);
    setSelectedOption(null);

    if (questions && currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Finished
      onComplete(newResults);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Preparando Teste de Nivelamento...</h2>
        <p className="text-gray-500">A IA está selecionando questões para identificar seu perfil.</p>
      </div>
    );
  }

  if (!questions || questions.length === 0) return <div>Erro ao carregar teste. Recarregue a página.</div>;

  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg border border-indigo-100">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-indigo-900">Teste de Nivelamento</h2>
          <span className="text-sm font-medium text-gray-500">Questão {currentIndex + 1} de {questions.length}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
          />
        </div>
        
        <p className="text-gray-600 mb-6">
          Responda para que possamos adaptar a dificuldade da trilha para você.
        </p>

        <div className="text-lg text-gray-800 leading-relaxed mb-8">
           <MathRenderer text={currentQ.text} />
        </div>

        <div className="space-y-3">
          {currentQ.options?.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedOption(opt)}
              className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                selectedOption === opt
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md'
                  : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                  selectedOption === opt ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 text-gray-400'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <MathRenderer text={opt} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleAnswer}
          disabled={!selectedOption}
          className={`flex items-center gap-2 px-8 py-3 rounded-lg font-bold text-white transition-all ${
            selectedOption ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {currentIndex === questions.length - 1 ? 'Finalizar Diagnóstico' : 'Próxima'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PlacementTest;