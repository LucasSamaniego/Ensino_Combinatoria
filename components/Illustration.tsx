import React from 'react';
import { VisualizationData } from '../types';

interface IllustrationProps {
  data: VisualizationData;
}

const Illustration: React.FC<IllustrationProps> = ({ data }) => {
  if (!data || data.type === 'none') return null;

  const { type, data: params, label } = data;

  // Guard against undefined parameters
  if (!params) return null;

  // --- Renderers for specific types ---

  // 1. Slots (Principles of Counting, Permutations, Digits)
  // Params: { count: number, values: string[] | null }
  const renderSlots = () => {
    const count = Math.min(params.count || 3, 8); // Max 8 slots to fit
    const width = count * 60;
    
    return (
      <svg viewBox={`0 0 ${width + 20} 80`} className="w-full h-32 max-w-md mx-auto">
        {Array.from({ length: count }).map((_, i) => (
          <g key={i} className="fade-in-delay" style={{ animationDelay: `${i * 0.2}s` }}>
            <rect 
              x={10 + i * 60} 
              y={20} 
              width={50} 
              height={50} 
              rx={4}
              fill="white" 
              stroke="#4f46e5" 
              strokeWidth="2"
              className="draw-path"
            />
            {params.values && params.values[i] && (
              <text 
                x={35 + i * 60} 
                y={55} 
                textAnchor="middle" 
                fill="#1e1b4b" 
                fontSize="20" 
                fontWeight="bold"
                className="opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]"
                style={{ animationDelay: `${i * 0.2 + 0.5}s` }}
              >
                {params.values[i]}
              </text>
            )}
            <line x1={10 + i*60} y1={75} x2={60 + i*60} y2={75} stroke="#cbd5e1" strokeWidth="2" />
          </g>
        ))}
        <text x={(width+20)/2} y={15} textAnchor="middle" fontSize="10" fill="#64748b">{label || "Decisões Sequenciais"}</text>
      </svg>
    );
  };

  // 2. Circular (Round Table)
  // Params: { items: number, labels: string[] }
  const renderCircular = () => {
    const items = Math.min(params.items || 5, 12);
    const radius = 60;
    const cx = 100;
    const cy = 100;
    
    return (
      <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#94a3b8" strokeWidth="2" className="draw-path" />
        {Array.from({ length: items }).map((_, i) => {
          const angle = (i * 2 * Math.PI) / items - Math.PI / 2;
          const x = cx + radius * Math.cos(angle);
          const y = cy + radius * Math.sin(angle);
          return (
            <g key={i} className="fade-in-delay" style={{ animationDelay: `${i * 0.1}s` }}>
              <circle cx={x} cy={y} r={12} fill="#e0e7ff" stroke="#4338ca" strokeWidth="2" />
              <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#312e81">
                {params.labels ? params.labels[i] : String.fromCharCode(65 + i)}
              </text>
            </g>
          );
        })}
        <text x={cx} y={cy+5} textAnchor="middle" fontSize="10" fill="#94a3b8">Perm. Circular</text>
      </svg>
    );
  };

  // 3. Venn Diagram (Sets, Inclusion-Exclusion)
  // Params: { sets: 2 | 3 }
  const renderVenn = () => {
    return (
      <svg viewBox="0 0 200 140" className="w-64 h-48 mx-auto">
        <circle cx="70" cy="70" r="50" fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" strokeWidth="2" className="draw-path" />
        <circle cx="130" cy="70" r="50" fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" className="draw-path" style={{ animationDelay: '0.5s' }} />
        {params.sets === 3 && (
           <circle cx="100" cy="110" r="40" fill="rgba(34, 197, 94, 0.2)" stroke="#22c55e" strokeWidth="2" className="draw-path" style={{ animationDelay: '1s' }} />
        )}
        <text x="30" y="30" fill="#ef4444" fontWeight="bold">A</text>
        <text x="170" y="30" fill="#3b82f6" fontWeight="bold">B</text>
        {params.sets === 3 && <text x="100" y="140" fill="#22c55e" fontWeight="bold">C</text>}
      </svg>
    );
  };

  // 4. Urn/Balls (Combinations, Probability)
  // Params: { balls: string[] } (array of colors or labels)
  const renderUrn = () => {
    const balls = params.balls || ['R', 'R', 'B', 'B', 'G'];
    return (
      <svg viewBox="0 0 160 160" className="w-40 h-40 mx-auto">
        <path d="M 40 40 L 40 140 Q 80 160 120 140 L 120 40" fill="none" stroke="#334155" strokeWidth="3" className="draw-path" />
        <ellipse cx="80" cy="40" rx="40" ry="10" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
        <g className="fade-in-delay">
          {balls.map((b: string, i: number) => {
             const row = Math.floor(i / 3);
             const col = i % 3;
             const color = b.startsWith('R') ? '#fca5a5' : b.startsWith('B') ? '#93c5fd' : '#86efac';
             const stroke = b.startsWith('R') ? '#ef4444' : b.startsWith('B') ? '#3b82f6' : '#22c55e';
             return (
               <circle 
                 key={i} 
                 cx={60 + col * 20 + (row % 2) * 10} 
                 cy={130 - row * 20} 
                 r={9} 
                 fill={color} 
                 stroke={stroke}
               />
             );
          })}
        </g>
      </svg>
    );
  };

  const renderContent = () => {
    switch (type) {
      case 'slots': return renderSlots();
      case 'circular': return renderCircular();
      case 'venn': return renderVenn();
      case 'urn': return renderUrn();
      default: return null;
    }
  };

  return (
    <div className="my-6 p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-inner flex flex-col items-center">
      {renderContent()}
      {label && <p className="text-xs text-center text-slate-500 mt-2 font-mono">{label}</p>}
    </div>
  );
};

export default Illustration;