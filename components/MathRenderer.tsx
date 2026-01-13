import React, { useEffect, useRef } from 'react';

// Declare katex on window since we load it via CDN
declare global {
  interface Window {
    katex: any;
  }
}

interface MathRendererProps {
  text: string;
  className?: string;
}

const MathRenderer: React.FC<MathRendererProps> = ({ text, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !window.katex) return;

    // Split text by LaTeX delimiters $...$
    // This is a basic parser. It assumes $...$ for inline math.
    const parts = text.split(/(\$[^\$]+\$)/g);

    containerRef.current.innerHTML = '';

    parts.forEach(part => {
      const span = document.createElement('span');
      if (part.startsWith('$') && part.endsWith('$')) {
        try {
          // Remove $ delimiters
          const latex = part.slice(1, -1);
          window.katex.render(latex, span, {
            throwOnError: false,
            displayMode: false // Inline by default
          });
        } catch (e) {
          span.innerText = part;
        }
      } else {
        // Handle newlines as <br>
        const lines = part.split('\n');
        lines.forEach((line, i) => {
          if (i > 0) containerRef.current?.appendChild(document.createElement('br'));
          const textNode = document.createTextNode(line);
          containerRef.current?.appendChild(textNode);
        });
        return; // Skip appending span since we handled text nodes
      }
      containerRef.current?.appendChild(span);
    });
  }, [text]);

  return <div ref={containerRef} className={`text-gray-800 leading-relaxed ${className}`} />;
};

export default MathRenderer;