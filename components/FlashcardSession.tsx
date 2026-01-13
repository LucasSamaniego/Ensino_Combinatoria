import React, { useState } from 'react';
import { Flashcard } from '../types';
import { ReviewGrade } from '../services/srsService';
import MathRenderer from './MathRenderer';
import { RotateCcw, Brain, Check, ChevronsRight, CalendarClock } from 'lucide-react';

interface FlashcardSessionProps {
  cards: Flashcard[];
  onReview: (cardId: string, grade: ReviewGrade) => void;
  onFinish: () => void;
}

const FlashcardSession: React.FC<FlashcardSessionProps> = ({ cards, onReview, onFinish }) => {
  // Since 'cards' prop shrinks as we review (parent filters them out),
  // we track completed count to display progress (e.g. "2 / 5").
  const [completedCount, setCompletedCount] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // If no cards are left (or passed empty), show the completion screen.
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <Check className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Tudo em dia!</h2>
        <p className="text-gray-500 mt-2">Você completou todas as revisões agendadas para agora.</p>
        <button onClick={onFinish} className="mt-8 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Voltar ao Painel
        </button>
      </div>
    );
  }

  // Always take the head of the list. The list shifts as items are reviewed in the parent.
  const currentCard = cards[0];

  // Safety guard
  if (!currentCard) return null;

  const totalCards = cards.length + completedCount;
  const currentDisplayIndex = completedCount + 1;

  const handleGrade = (grade: ReviewGrade) => {
    // 1. Send review to parent (this will eventually remove the card from props)
    onReview(currentCard.id, grade);
    
    // 2. Reset local state for next card
    setIsFlipped(false);
    setCompletedCount(prev => prev + 1);
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2 text-indigo-900 font-bold">
           <Brain className="w-6 h-6" /> Revisão Espaçada (Active Recall)
        </div>
        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {currentDisplayIndex} / {totalCards}
        </span>
      </div>

      {/* Card Container */}
      <div 
        className="relative w-full h-80 perspective-1000 cursor-pointer group"
        onClick={() => !isFlipped && setIsFlipped(true)}
      >
        <div className={`relative w-full h-full duration-500 transform-style-3d transition-all shadow-xl rounded-2xl border border-gray-200 ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* FRONT */}
          <div className="absolute w-full h-full backface-hidden bg-white rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <span className="absolute top-4 left-4 text-xs font-bold text-indigo-400 uppercase tracking-wider">Pergunta</span>
            <div className="text-xl md:text-2xl text-gray-800">
               <MathRenderer text={currentCard.front} />
            </div>
            <p className="absolute bottom-4 text-xs text-gray-400 animate-pulse">Toque para ver a resposta</p>
          </div>

          {/* BACK */}
          <div className="absolute w-full h-full backface-hidden bg-indigo-50 rounded-2xl p-8 flex flex-col items-center justify-center text-center rotate-y-180">
            <span className="absolute top-4 left-4 text-xs font-bold text-indigo-600 uppercase tracking-wider">Resposta</span>
            <div className="text-lg md:text-xl text-indigo-900 leading-relaxed">
              <MathRenderer text={currentCard.back} />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 h-24">
        {isFlipped ? (
          <div className="grid grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-4">
            <button 
              onClick={(e) => { e.stopPropagation(); handleGrade(ReviewGrade.AGAIN); }}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 transition-colors border-b-4 border-red-200 hover:border-red-300 active:border-b-0 active:translate-y-1"
            >
              <RotateCcw className="w-5 h-5 mb-1" />
              <span className="text-xs font-bold uppercase">Errei (0d)</span>
            </button>
            
            <button 
              onClick={(e) => { e.stopPropagation(); handleGrade(ReviewGrade.HARD); }}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors border-b-4 border-orange-200 hover:border-orange-300 active:border-b-0 active:translate-y-1"
            >
              <CalendarClock className="w-5 h-5 mb-1" />
              <span className="text-xs font-bold uppercase">Difícil</span>
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); handleGrade(ReviewGrade.GOOD); }}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors border-b-4 border-blue-200 hover:border-blue-300 active:border-b-0 active:translate-y-1"
            >
              <Check className="w-5 h-5 mb-1" />
              <span className="text-xs font-bold uppercase">Bom</span>
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); handleGrade(ReviewGrade.EASY); }}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 transition-colors border-b-4 border-green-200 hover:border-green-300 active:border-b-0 active:translate-y-1"
            >
              <ChevronsRight className="w-5 h-5 mb-1" />
              <span className="text-xs font-bold uppercase">Fácil</span>
            </button>
          </div>
        ) : (
          <div className="flex justify-center items-center h-full text-gray-400 text-sm">
             Tente responder mentalmente antes de virar.
          </div>
        )}
      </div>
      
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};

export default FlashcardSession;