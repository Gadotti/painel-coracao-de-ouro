# CLAUDE.md

As regras do projeto estão em [AGENTS.md](AGENTS.md) e valem integralmente aqui:

@AGENTS.md

## Notas para o Claude Code

- Antes de dar uma tarefa por concluída, rode `npm run check` e mostre o resultado.
- Mudou o formato do `status.json`? Atualize juntos: `src/status/statusSchema.js`,
  `public/js/types.js`, `examples/status.example.json`, `public/js/data/demoStatus.js`
  e `docs/contrato-status.md`. O teste que valida a simulação contra o schema pega divergências.
- Sprite novo: adicione em `public/js/sprites/spriteDefs.js` (o schema do tema aceita
  automaticamente) e cite em `docs/contrato-status.md`.
- Para ver o painel: `npm run dev:coletor-falso` em um terminal e `npm run dev` em outro, ou
  `http://localhost:4242/?demo`.
