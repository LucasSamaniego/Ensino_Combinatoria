
import React, { useState, useEffect } from 'react';
import { Question, Interaction, TopicId, Difficulty } from '../types';
import { generatePlacementQuestions } from '../services/geminiService';
import MathRenderer from './MathRenderer';
import { Loader2, CheckCircle, ArrowRight, RefreshCw, Building2 } from 'lucide-react';

interface PlacementTestProps {
  category: 'math' | 'concursos' | 'portuguese';
  subCategory?: string;
  onComplete: (results: Interaction[]) => void;
}

const FALLBACK_QUESTIONS: Question[] = [
  {
    id: 'offline-1',
    text: 'Se um conjunto A possui 3 elementos, quantos subconjuntos ele possui no total?',
    options: ['3', '6', '8', '9'],
    correctAnswer: '8',
    explanation: 'O número de subconjuntos é dado por 2^n, onde n é o número de elementos. 2^3 = 8.',
    difficulty: Difficulty.INTERMEDIATE,
    topicId: TopicId.INTRO_COUNTING,
    subSkillId: 'sets_basic',
    subSkillName: 'Conjuntos',
    hints: [],
    miniTheory: ''
  }
];

const PlacementTest: React.FC<PlacementTestProps> = ({ category, subCategory, onComplete }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Interaction[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    loadTest();
  }, [category, subCategory]);

  const loadTest = async () => {
    setLoading(true);
    try {
      // Passa a subcategoria para refinar o teste (Ex: Tabuada vs Combinatória)
      const qs = await generatePlacementQuestions(category, subCategory);
      if (qs && qs.length > 0) {
        setQuestions(qs);
      } else {
        setQuestions(FALLBACK_QUESTIONS);
      }
    } catch (e) {
      setQuestions(FALLBACK_QUESTIONS);
    } finally {
      setLoading(false);
    }
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
      timeSpentSeconds: 30, 
      difficulty: Difficulty.INTERMEDIATE
    };

    const newResults = [...results, interaction];
    setResults(newResults);
    setSelectedOption(null);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete(newResults);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-800">
          Preparando Nivelamento
        </h2>
        <p className="text-gray-500 mb-2">
           {subCategory === 'basic' ? 'Foco: Tabuada e Aritmética' : (subCategory === 'combinatorics' ? 'Foco: Análise Combinatória' : 'Avaliando conhecimentos gerais')}
        </p>
        <p className="text-xs text-gray-400">A IA está selecionando questões para identificar seu perfil.</p>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg border border-indigo-100 animate-in fade-in zoom-in duration-300">
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
        
        <p className="text-gray-600 mb-6 font-medium">
          Identificando sua base em {subCategory === 'basic' ? 'Matemática Básica' : (subCategory === 'combinatorics' ? 'Combinatória' : category)}.
        </p>

        {currentQ.banca && (
           <div className="mb-4 inline-flex items-center gap-2 px-2 py-1 bg-slate-50 text-slate-500 rounded border border-slate-100 text-[10px] font-bold uppercase">
              <Building2 className="w-3 h-3" /> {currentQ.banca}
           </div>
        )}

        <div className="text-lg text-gray-800 leading-relaxed mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
           <MathRenderer text={currentQ.text} />
        </div>

        <div className="space-y-3">
          {currentQ.options?.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedOption(opt)}
              className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                selectedOption === opt
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md ring-2 ring-indigo-100'
                  : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${
                  selectedOption === opt ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 text-gray-400'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <div className="flex-grow">
                  <MathRenderer text={opt} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button
          onClick={handleAnswer}
          disabled={!selectedOption}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all ${
            selectedOption ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transform hover:-translate-y-0.5' : 'bg-gray-200 cursor-not-allowed'
          }`}
        >
          {currentIndex === questions.length - 1 ? 'Finalizar' : 'Próxima'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PlacementTest;
