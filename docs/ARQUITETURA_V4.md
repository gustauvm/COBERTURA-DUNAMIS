# Arquitetura v4 Modernizada

## Estado atual
A v4 continua funcional, mas agora com base de evolucao moderna sem quebra de fluxo.

## Camadas
- UI e regras de negocio: app.js
- Configuracao: config.js
- Dados modernos compartilhados: core/data-layer.js
- Offline/cache: sw.js
- Tooling e build moderno: vite + eslint + prettier

## Tecnologias adicionadas
- Vite (dev server, build e preview)
- ESLint (baseline adaptado para legado)
- Prettier
- Data layer reutilizavel para REST paginado com timeout
- Build moderno alternativo via esbuild (scripts/build-modern.js), compativel com caminho atual do projeto

## Scripts
- npm run dev
- npm run dev:static
- npm run build
- npm run build:vite
- npm run preview
- npm run check
- npm run lint
- npm run format

## Roadmap incremental (sem migrar para v5)
1. Extrair auth de app.js para core/auth.js
2. Extrair colaboradores para core/collaborators.js
3. Extrair unidades para core/units.js
4. Migrar renderizacoes criticas para componentes pequenos
5. Introduzir testes de smoke para login/carregamento/tab principal
