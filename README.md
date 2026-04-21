# Dunamis Pro V5

V5 focada exclusivamente na Busca Rápida operacional.

## Rodar localmente

Como esta pasta está dentro de um caminho com `#`, o Vite dev server pode servir TSX sem transformar corretamente. Use o preview compilado:

```powershell
npm run dev
```

Esse comando executa `build` e abre o preview em `http://127.0.0.1:5173`.

## Scripts

- `npm run dev`: build + preview local seguro.
- `npm run dev:vite`: Vite dev puro, use só fora de caminhos com `#`.
- `npm run build`: build de produção.
- `npm run preview`: preview local do build.
- `npm run lint`: validação ESLint.
- `npm run typecheck`: validação TypeScript.
- `npm run check`: lint + typecheck + build.
- `npm run deploy:dry`: validação de publicação sem deploy.

A v4.1 permanece fora desta pasta e segue como produção atual até a V5 ser aprovada.
