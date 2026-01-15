# Plataforma de Ensino de Análise Combinatória (BKT)

Este é um sistema de ensino inteligente que utiliza **Bayesian Knowledge Tracing (BKT)** para avaliar a habilidade do aluno em tempo real e adaptar o conteúdo dinamicamente.

## Funcionalidades Principais
- **Avaliação Adaptativa**: O sistema calcula a probabilidade de maestria em cada sub-habilidade usando o algoritmo BKT.
- **Gerador de Problemas com IA**: Utiliza o Google Gemini para criar questões inéditas baseadas no nível do aluno (Básico até Olímpico).
- **Revisão Espaçada (SRS)**: Sistema de flashcards baseado no algoritmo SuperMemo-2 (SM-2).
- **Estúdio de Aula**: Ambiente para professores com Manim (animações matemáticas) e integração de câmera.

## Desenvolvimento Local
1. Instale as dependências: `npm install`
2. Execute o projeto: `npm run dev`

## Estrutura do Sistema
- `services/tracingService.ts`: Implementação do motor de inferência Bayesiana.
- `services/geminiService.ts`: Orquestração de prompts para geração de problemas matemáticos.
- `components/`: Componentes modulares da interface.
