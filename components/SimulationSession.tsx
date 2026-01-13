import React, { useState, useEffect } from 'react';
import { SimulationConfig, Question, Interaction, TopicId } from '../types';
import { generateSimulationQuestions } from '../services/geminiService';
import MathRenderer from './MathRenderer';
import { Loader2, ArrowRight, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface SimulationSessionProps {
  config: SimulationConfig;
  onComplete: (interactions: Interaction[]) => void;
  onCancel: () => void;
}

const SimulationSession: React.FC<SimulationSessionProps> = ({ config, onComplete, onCancel }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [startTime, setStartTime] = useState(0);
  
  // Timer for display
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const qs = await generateSimulationQuestions(config);
      setQuestions(qs);
      setUserAnswers(new Array(qs.length).fill(''));
      setStartTime(Date.now());
      setLoading(false);
    };
    load();
  }, [config]);

  useEffect(() => {
    let interval: any;
    if (!loading && !isFinished) {
      interval = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loading, isFinished]);

  const handleSelectOption = (option: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = option;
    setUserAnswers(newAnswers);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleFinish = () => {
    setIsFinished(true);
    // Create interactions for history
    const interactions: Interaction[] = questions.map((q, idx) => {
      const isCorrect = userAnswers[idx] === q.correctAnswer;
      return {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        topicId: (q.topicId || 'intro_counting') as TopicId,
        subSkillId: 'simulation',
        isCorrect: isCorrect,
        timeSpentSeconds: timeElapsed / questions.length, // Avg time
        difficulty: config.difficulty
      };
    });
    // We don't call onComplete immediately, we show results first
  };

  const handleExit = () => {
     // Now we save to history
     const interactions: Interaction[] = questions.map((q, idx) => {
      const isCorrect = userAnswers[idx] === q.correctAnswer;
      return {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        topicId: (q.topicId || 'intro_counting') as TopicId,
        subSkillId: 'simulation',
        isCorrect: isCorrect,
        timeSpentSeconds: timeElapsed / questions.length,
        difficulty: config.difficulty
      };
    });
    onComplete(interactions);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Gerando Prova {config.style}...</h2>
        <p className="text-gray-500">Preparando questões desafiadoras.</p>
      </div>
    );
  }

  if (questions.length === 0) return <div>Erro ao gerar prova. Tente novamente. <button onClick={onCancel} className="text-blue-600">Voltar</button></div>;

  // --- RESULTS VIEW ---
  if (isFinished) {
    const score = questions.reduce((acc, q, idx) => acc + (q.correctAnswer === userAnswers[idx] ? 1 : 0), 0);
    const percentage = Math.round((score / questions.length) * 100);
    
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center border border-gray-100">
           <h2 className="text-3xl font-bold text-gray-900 mb-2">Simulado Finalizado</h2>
           <p className="text-gray-500 mb-6">{config.title}</p>
           
           <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                 <div className="text-4xl font-bold text-indigo-600">{score}/{questions.length}</div>
                 <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Acertos</div>
              </div>
              <div className="text-center">
                 <div className="text-4xl font-bold text-gray-700">{formatTime(timeElapsed)}</div>
                 <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Tempo Total</div>
              </div>
           </div>

           <div className="w-full bg-gray-100 rounded-full h-4 mb-8 overflow-hidden">
              <div 
                className={`h-full ${percentage >= 70 ? 'bg-green-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${percentage}%` }}
              />
           </div>

           <button onClick={handleExit} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg">
             Salvar e Voltar
           </button>
        </div>

        <div className="space-y-4">
           <h3 className="font-bold text-gray-700 ml-2">Gabarito Comentado</h3>
           {questions.map((q, idx) => {
             const isCorrect = userAnswers[idx] === q.correctAnswer;
             return (
               <div key={idx} className={`bg-white p-6 rounded-xl border-l-4 shadow-sm ${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                  <div className="flex items-start gap-3 mb-4">
                     <span className="font-mono text-sm font-bold text-gray-400 mt-1">Q{idx+1}</span>
                     <div className="flex-grow">
                        <MathRenderer text={q.text} />
                     </div>
                     {isCorrect 
                       ? <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                       : <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                     }
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                       <span className="block text-xs text-gray-400 uppercase font-bold mb-1">Sua Resposta</span>
                       <span className={`font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                         {userAnswers[idx] || 'Em branco'}
                       </span>
                    </div>
                    <div className="bg-indigo-50 p-3 rounded-lg">
                       <span className="block text-xs text-indigo-300 uppercase font-bold mb-1">Gabarito</span>
                       <span className="font-bold text-indigo-700">{q.correctAnswer}</span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                     <span className="font-bold text-gray-800 block mb-1">Resolução:</span>
                     <MathRenderer text={q.explanation} />
                  </div>
               </div>
             );
           })}
        </div>
      </div>
    );
  }

  // --- QUESTION VIEW ---
  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
           <Clock className="w-5 h-5 text-gray-400" /> {formatTime(timeElapsed)}
         </h2>
         <div className="flex gap-1">
            {questions.map((_, idx) => (
              <div 
                key={idx}
                className={`w-3 h-3 rounded-full ${
                  idx === currentIndex ? 'bg-indigo-600 ring-2 ring-indigo-200' : 
                  userAnswers[idx] ? 'bg-indigo-300' : 'bg-gray-200'
                }`}
              />
            ))}
         </div>
         <button onClick={onCancel} className="text-sm text-gray-400 hover:text-red-500 font-medium">Cancelar</button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 min-h-[400px] flex flex-col">
         <div className="p-8 border-b border-gray-100 flex-grow">
            <div className="flex justify-between mb-6">
              <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1 rounded-full uppercase tracking-wider">
                Questão {currentIndex + 1}
              </span>
              <span className="text-xs font-bold text-indigo-600">{config.style}</span>
            </div>
            
            <div className="text-lg text-gray-900 font-serif leading-relaxed mb-8">
               <MathRenderer text={currentQ.text} />
            </div>

            <div className="space-y-3">
              {currentQ.options?.map((opt, idx) => {
                 // Try to extract letter if it exists like "A) ..." or assume options are just text
                 // but Gemini usually puts the letter in the option text or as a separate field.
                 // We will display A, B, C, D based on index.
                 // NOTE: For 'options' array from Gemini, usually it's just the content. 
                 // Let's assume correctAnswer matches the content OR the letter.
                 // To be safe for Military style/simulations, let's treat the index-based letter as the key.
                 
                 // Simpler approach: Just compare values strictly or allow user to pick.
                 // But for simulation, we usually click the block.
                 
                 const letter = String.fromCharCode(65 + idx); // A, B, C...
                 // If correctAnswer is 'A', we match letter. If it's '120', we match text.
                 const isSelected = userAnswers[currentIndex] === letter || userAnswers[currentIndex] === opt;
                 
                 return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(currentQ.correctAnswer.length === 1 ? letter : opt)} 
                    // Note: If Gemini returns 'A' as correct answer, we store 'A'. 
                    // If it returns '120', we store '120'.
                    // To unify, let's try to match what the user clicks to what is likely the format.
                    // For this implementation, I will store the OPTION TEXT if the answer looks like text, 
                    // or the LETTER if the answer looks like a letter.
                    // Actually, let's just stick to the letter for UI simplicity if possible, but the API might return value.
                    // Hack: Store the content `opt` effectively.
                    
                    className={`w-full p-4 text-left rounded-xl border-2 transition-all group ${
                      userAnswers[currentIndex] === opt || (currentQ.correctAnswer.length === 1 && userAnswers[currentIndex] === letter)
                        ? 'border-indigo-600 bg-indigo-50 shadow-md'
                        : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm ${
                         userAnswers[currentIndex] === opt || (currentQ.correctAnswer.length === 1 && userAnswers[currentIndex] === letter)
                         ? 'bg-indigo-600 border-indigo-600 text-white' 
                         : 'bg-white border-gray-300 text-gray-400 group-hover:border-indigo-300'
                      }`}>
                        {letter}
                      </div>
                      <div className="text-gray-800">
                        <MathRenderer text={opt} />
                      </div>
                    </div>
                  </button>
                 );
              })}
            </div>
         </div>

         <div className="p-6 bg-gray-50 rounded-b-2xl flex justify-between items-center">
            <button 
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-6 py-2 text-gray-600 font-bold disabled:opacity-30 hover:text-indigo-600"
            >
              Anterior
            </button>

            {isLast ? (
               <button 
                 onClick={handleFinish}
                 className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg shadow-green-200 flex items-center gap-2"
               >
                 Finalizar Prova <CheckCircle className="w-4 h-4"/>
               </button>
            ) : (
               <button 
                 onClick={() => setCurrentIndex(prev => prev + 1)}
                 className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center gap-2"
               >
                 Próxima <ArrowRight className="w-4 h-4"/>
               </button>
            )}
         </div>
      </div>
    </div>
  );
};

export default SimulationSession;