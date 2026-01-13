import React, { useEffect, useRef, useState } from 'react';

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
  const [katexReady, setKatexReady] = useState(false);

  useEffect(() => {
    // Check if KaTeX is globally available
    if (window.katex) {
      setKatexReady(true);
    } else {
      // Poll for KaTeX in case it's still loading (defer script)
      const interval = setInterval(() => {
        if (window.katex) {
          setKatexReady(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!katexReady) {
      // Fallback while loading: render plain text
      containerRef.current.innerText = text;
      return;
    }

    // Robust Regex for LaTeX splitting
    // Matches: $$...$$, \[...\], \(...\), $...$
    const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?:\$[^$]+?\$))/g;
    
    const parts = text.split(regex);

    containerRef.current.innerHTML = '';

    parts.forEach(part => {
      let isMath = false;
      let displayMode = false;
      let content = part;

      // Identify Delimiters
      if (part.startsWith('$$') && part.endsWith('$$')) {
        isMath = true; displayMode = true;
        content = part.slice(2, -2);
      } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
        isMath = true; displayMode = true;
        content = part.slice(2, -2);
      } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
        isMath = true; displayMode = false;
        content = part.slice(2, -2);
      } else if (part.startsWith('$') && part.endsWith('$')) {
        isMath = true; displayMode = false;
        content = part.slice(1, -1);
      }

      if (isMath) {
        renderMath(content, displayMode);
      } else {
        // Render Text (handle newlines)
        const lines = part.split('\n');
        lines.forEach((line, i) => {
          if (i > 0) containerRef.current?.appendChild(document.createElement('br'));
          containerRef.current?.appendChild(document.createTextNode(line));
        });
      }
    });

    function renderMath(latex: string, displayMode: boolean) {
      const span = document.createElement('span');
      if (displayMode) {
        span.style.display = 'block';
        span.style.textAlign = 'center';
        span.style.margin = '1rem 0';
      }
      
      // --- Heuristic Repair for JSON Parsing Issues ---
      // When JSON.parse sees "\t", "\f", "\b", etc., it converts them to control characters.
      // We must restore them to backslash + char to be valid LaTeX commands.
      let cleanLatex = latex
        .replace(/\t/g, '\\t')       // Restores \times, \tan, \tau
        .replace(/\f/g, '\\f')       // Restores \frac
        .replace(/\r/g, '\\r')       // Restores \rho, \right
        .replace(/[\x08]/g, '\\b')   // Restores \beta, \binom (Backspace char)
        .replace(/\n/g, '\\n')       // Restores \neq, \newline
        
        // Safety Fallbacks for common broken commands if control chars were stripped differently
        .replace(/(\s|^)imes(\s|$)/g, '$1\\times$2') 
        .replace(/(\s|^)frac(\{)/g, '$1\\frac$2')
        .replace(/(\s|^)sqrt(\{)/g, '$1\\sqrt$2')
        .replace(/(\s|^)text(\{)/g, '$1\\text$2')
        .replace(/(\s|^)le(\s|$)/g, '$1\\le$2')
        .replace(/(\s|^)ge(\s|$)/g, '$1\\ge$2')
        .replace(/(\s|^)cdot(\s|$)/g, '$1\\cdot$2')
        .replace(/(\s|^)infty(\s|$)/g, '$1\\infty$2');

      try {
        window.katex.render(cleanLatex, span, {
          throwOnError: false, 
          displayMode: displayMode,
          errorColor: '#ef4444', // Red color for standard KaTeX parse errors (syntax errors)
          strict: false
        });
      } catch (e) {
        // If an exception occurs (e.g. katex crash), fallback to plain text.
        // DO NOT style as red error to avoid jarring UX.
        span.innerText = latex;
        span.className = "inline-block text-gray-800 font-mono text-sm bg-gray-50 px-1 rounded border border-gray-200";
      }
      containerRef.current?.appendChild(span);
    }

  }, [text, katexReady]);

  return <div ref={containerRef} className={`text-gray-800 leading-relaxed ${className}`} />;
};

export default MathRenderer;