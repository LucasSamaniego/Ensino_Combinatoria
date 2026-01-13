import React, { useState, useEffect, useRef } from 'react';
import { TopicId, SkillState, Question, Difficulty, Interaction, TheoryContent } from '../types';
import { generateProblem } from '../services/geminiService';
import { getDifficultyForMastery } from '../services/tracingService';
import { ArrowLeft, Send, CheckCircle, XCircle, Loader2, Award, Clock, Lightbulb, BookOpen, HelpCircle } from 'lucide-react';
import MathRenderer from './MathRenderer';
import Illustration from './Illustration';

interface PracticeSessionProps {
  topicId: TopicId;
  topicName: string;
  topicSubSkills: { id: string, name: string }[];
  userSkills: { [key: string]: SkillState };
  onCompleteQuestion: (interaction: Interaction) => void;
  onBack: () => void;
}

const PracticeSession: React.FC<PracticeSessionProps> = ({ 
  topicId, 
  topicName,
  topicSubSkills,
  userSkills, 
  onCompleteQuestion,
  onBack 
}) => {
  const [targetSubSkill, setTargetSubSkill] = useState<{id: string, name: string} | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Interaction State
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  
  // Just-in-Time Help State
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [showMiniTheory, setShowMiniTheory] = useState(false);
  const [showFullExplanation, setShowFullExplanation] = useState(false);
  
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<any>(null);

  // Initialize: Pick a sub-skill
  useEffect(() => {
    pickSubSkill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickSubSkill = () => {
    const sortedSubSkills = [...topicSubSkills].sort((a, b) => {
      const masteryA = userSkills[a.id]?.masteryProbability || 0.1;
      const masteryB = userSkills[b.id]?.masteryProbability || 0.1;
      return masteryA - masteryB;
    });

    // 80% focus on weakest, 20% random for review
    const selected = Math.random() > 0.2 
      ? sortedSubSkills[0] 
      : topicSubSkills[Math.floor(Math.random() * topicSubSkills.length)];
    
    setTargetSubSkill(selected);
    loadProblem(selected);
  };

  const loadProblem = async (subSkill: {id: string, name: string}) => {
    if (!subSkill) return; // Guard
    setLoading(true);
    setQuestion(null);
    setFeedback(null);
    setUserAnswer('');
    setHintsRevealed(0);
    setShowMiniTheory(false);
    setShowFullExplanation(false);
    setElapsed(0);

    const currentMastery = userSkills[subSkill.id]?.masteryProbability || 0.1;
    const difficulty = getDifficultyForMastery(currentMastery);

    const newQuestion = await generateProblem(
      topicName,
      topicId,
      subSkill.id,
      subSkill.name,
      difficulty
    );
    
    setQuestion(newQuestion);
    setLoading(false);
    setStartTime(Date.now());
  };

  useEffect(() => {
    if (!loading && !feedback) {
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, feedback]);

  const handleSubmit = () => {
    if (!question || !userAnswer) return;

    const timeSpent = (Date.now() - startTime) / 1000;
    const normalizedUser = userAnswer.trim().toLowerCase();
    const normalizedCorrect = question.correctAnswer.trim().toLowerCase();
    
    const isCorrect = normalizedUser === normalizedCorrect || 
                     normalizedUser.replace('.',',') === normalizedCorrect.replace('.',',');

    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setShowFullExplanation(true); // Always show explanation after answer
    
    const interaction: Interaction = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      topicId: topicId,
      subSkillId: question.subSkillId,
      isCorrect,
      timeSpentSeconds: timeSpent,
      difficulty: question.difficulty
    };

    onCompleteQuestion(interaction);
  };

  const difficultyColor = (diff: Difficulty) => {
    switch(diff) {
      case Difficulty.BASIC: return 'text-green-600 bg-green-50 border-green-200';
      case Difficulty.INTERMEDIATE: return 'text-blue-600 bg-blue-50 border-blue-200';
      case Difficulty.ADVANCED: return 'text-purple-600 bg-purple-50 border-purple-200';
      case Difficulty.OLYMPIAD: return 'text-amber-600 bg-amber-50 border-amber-200';
    }
  };

  if (!targetSubSkill) return <div className="p-8">Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onBack} className="mb-6 flex items-center text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar à Trilha
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Problem Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden min-h-[500px] flex flex-col relative">
            
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{topicName}</span>
                 <h2 className="text-lg font-bold text-gray-800">{targetSubSkill.name}</h2>
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 text-gray-500 text-xs font-mono bg-gray-100 px-3 py-1 rounded-full">
                    <Clock className="w-3 h-3" /> {elapsed}s
                 </div>
                 {question && (
                   <span className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1 ${difficultyColor(question.difficulty)}`}>
                     {question.difficulty === Difficulty.OLYMPIAD && <Award className="w-3 h-3" />}
                     {question.difficulty}
                   </span>
                 )}
              </div>
            </div>

            <div className="p-8 flex-grow">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 animate-pulse">
                  <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
                  <p>A IA está gerando um desafio personalizado...</p>
                </div>
              ) : question ? (
                <div className="animate-in fade-in duration-500">
                   
                   {question.visualization && (
                      <div className="mb-6">
                        <Illustration data={question.visualization} />
                      </div>
                   )}

                   <div className="text-xl text-gray-800 font-serif leading-relaxed mb-8">
                     <MathRenderer text={question.text} />
                   </div>

                   {/* Just-in-Time Theory Display */}
                   {showMiniTheory && question.miniTheory && (
                     <div className="mb-6 bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg animate-in slide-in-from-left-2">
                       <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-700 mb-2 uppercase">
                         <BookOpen className="w-4 h-4"/> Conceito Chave
                       </h4>
                       <div className="text-sm text-indigo-900">
                         <MathRenderer text={question.miniTheory} />
                       </div>
                     </div>
                   )}

                   {/* Hints Display */}
                   {hintsRevealed > 0 && question.hints && (
                     <div className="mb-8 space-y-2">
                       {question.hints.slice(0, hintsRevealed).map((hint, i) => (
                         <div key={i} className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800 flex gap-3 animate-in fade-in">
                            <Lightbulb className="w-4 h-4 flex-shrink-0 mt-1 text-yellow-600" />
                            <MathRenderer text={hint} />
                         </div>
                       ))}
                     </div>
                   )}

                   {/* Input Area */}
                   {!feedback && (
                     <div className="space-y-4">
                       {question.options ? (
                         <div className="grid grid-cols-1 gap-3">
                           {question.options.map((opt, idx) => (
                             <button
                               key={idx}
                               onClick={() => setUserAnswer(opt)}
                               className={`p-4 text-left rounded-xl border-2 transition-all ${
                                 userAnswer === opt 
                                   ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md ring-1 ring-indigo-200' 
                                   : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                               }`}
                             >
                               <span className="font-bold text-gray-400 mr-3">{String.fromCharCode(65 + idx)}.</span> 
                               <span className="inline-block"><MathRenderer text={opt} /></span>
                             </button>
                           ))}
                         </div>
                       ) : (
                         <input
                           type="text"
                           value={userAnswer}
                           onChange={(e) => setUserAnswer(e.target.value)}
                           className="w-full p-4 border border-gray-300 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-center text-lg"
                           placeholder="Sua resposta..."
                           onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                         />
                       )}

                       <button
                         onClick={handleSubmit}
                         disabled={!userAnswer}
                         className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 mt-4 transition-all ${
                           userAnswer ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transform hover:-translate-y-0.5' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                         }`}
                       >
                         <Send className="w-4 h-4" /> Verificar Resposta
                       </button>
                     </div>
                   )}

                   {/* Feedback & Explanation */}
                   {feedback && (
                      <div className={`mt-8 p-6 rounded-xl border animate-in slide-in-from-bottom-4 ${feedback === 'correct' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            {feedback === 'correct' ? <CheckCircle className="w-8 h-8 text-green-600"/> : <XCircle className="w-8 h-8 text-red-600"/>}
                            <div>
                              <h3 className={`font-bold text-lg ${feedback === 'correct' ? 'text-green-800' : 'text-red-800'}`}>
                                {feedback === 'correct' ? 'Correto!' : 'Incorreto'}
                              </h3>
                              <p className="text-sm text-gray-600">
                                Resposta: <strong><MathRenderer text={question.correctAnswer} className="inline"/></strong>
                              </p>
                            </div>
                        </div>

                        {showFullExplanation && (
                          <div className="pt-4 border-t border-black/5 mt-4">
                            <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Resolução Passo a Passo</h4>
                            <div className="bg-white/50 p-4 rounded-lg text-sm text-gray-800 leading-relaxed">
                               <MathRenderer text={question.explanation} />
                            </div>
                          </div>
                        )}

                        <button onClick={pickSubSkill} className="mt-6 w-full py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm">
                          Próximo Desafio &rarr;
                        </button>
                      </div>
                   )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Sidebar: Just-in-Time Tools */}
        <div className="space-y-4">
          <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-lg">
             <h3 className="font-bold text-lg mb-1">Ferramentas de Apoio</h3>
             <p className="text-indigo-200 text-xs mb-6">Use apenas se necessário.</p>
             
             <div className="space-y-3">
               <button 
                 onClick={() => setShowMiniTheory(!showMiniTheory)}
                 disabled={!question || feedback !== null}
                 className="w-full flex items-center justify-between p-3 rounded-lg bg-indigo-800 hover:bg-indigo-700 transition-colors border border-indigo-700 disabled:opacity-50"
               >
                 <span className="flex items-center gap-2 font-medium text-sm">
                   <BookOpen className="w-4 h-4 text-indigo-300"/> Revisão Rápida
                 </span>
                 {showMiniTheory && <CheckCircle className="w-4 h-4 text-green-400"/>}
               </button>

               <button 
                 onClick={() => setHintsRevealed(prev => Math.min(prev + 1, (question?.hints?.length || 0)))}
                 disabled={!question || !question.hints || hintsRevealed >= question.hints.length || feedback !== null}
                 className="w-full flex items-center justify-between p-3 rounded-lg bg-indigo-800 hover:bg-indigo-700 transition-colors border border-indigo-700 disabled:opacity-50"
               >
                 <span className="flex items-center gap-2 font-medium text-sm">
                   <Lightbulb className="w-4 h-4 text-yellow-400"/> 
                   Pedir Dica {question?.hints ? `(${hintsRevealed}/${question.hints.length})` : ''}
                 </span>
               </button>
             </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
             <h4 className="font-bold text-gray-800 text-sm mb-4">Progresso na Habilidade</h4>
             <div className="space-y-4">
                <div>
                   <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Nível Atual</span>
                      <span>{userSkills[targetSubSkill?.id || ''] ? Math.round(userSkills[targetSubSkill?.id || ''].masteryProbability * 100) : 0}%</span>
                   </div>
                   <div className="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${userSkills[targetSubSkill?.id || ''] ? userSkills[targetSubSkill?.id || ''].masteryProbability * 100 : 0}%` }}
                      />
                   </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                   O sistema adapta a dificuldade com base nos seus acertos e no tempo de resposta.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeSession;