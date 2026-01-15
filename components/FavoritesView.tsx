
import React from 'react';
import { Question } from '../types';
import MathRenderer from './MathRenderer';
import { ArrowLeft, Star, Trash2, Building2 } from 'lucide-react';

interface FavoritesViewProps {
  favorites: Question[];
  onRemove: (questionId: string) => void;
  onBack: () => void;
}

const FavoritesView: React.FC<FavoritesViewProps> = ({ favorites, onRemove, onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Painel
        </button>
        <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 px-4 py-2 rounded-full border border-yellow-100">
          <Star className="w-5 h-5 fill-yellow-600" />
          <span className="font-bold text-sm">{favorites.length} questões salvas</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-2xl font-bold text-gray-800">Meus Favoritos</h2>
          <p className="text-gray-500 text-sm mt-1">
            Questões que você marcou para revisar mais tarde.
          </p>
        </div>

        {favorites.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Star className="w-12 h-12 mx-auto mb-4 text-gray-200" />
            <p className="font-medium">Você ainda não favoritou nenhuma questão.</p>
            <p className="text-sm mt-2">Clique na estrela durante os exercícios para salvar questões aqui.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {favorites.map((q) => (
              <div key={q.id} className="p-6 hover:bg-slate-50 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                        {q.subSkillName || 'Tópico Geral'}
                      </span>
                      {q.banca && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">
                           <Building2 className="w-3 h-3" /> {q.banca}
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => onRemove(q.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                    title="Remover dos favoritos"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-gray-800 mb-6 leading-relaxed">
                  <MathRenderer text={q.text} />
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div className="flex items-start gap-4">
                    <div className="flex-grow">
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-1">Gabarito & Explicação</h4>
                      <p className="font-bold text-green-700 mb-2">Resposta: <MathRenderer text={q.correctAnswer} className="inline"/></p>
                      <div className="text-sm text-gray-600">
                         <MathRenderer text={q.explanation} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesView;
