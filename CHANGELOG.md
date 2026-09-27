# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versões seguem
[SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]

## [0.1.0] - 2026-09-27

### Adicionado

- Painel 8-bit com o tema do Guia do Mochileiro: nota 42, Rota do dia, Motor de Improbabilidade,
  Tripulação, Hangar, Peixe Babel, Burocracia Vogon, Marvin e Terra Mk II.
- Servidor Node/Express que lê o `status.json` do coletor, valida com Joi e descarta campos
  desconhecidos (`/api/status`), além de `/api/theme` e `/healthz`.
- Tema padrão com sobrescrita por arquivo (`THEME_PATH`).
- Autenticação HTTP Basic opcional com hash scrypt e limite de tentativas.
- CSP rígido, fontes servidas localmente e logs em JSON.
- Modo simulação (`?demo`, `?cenario=`) e coletor falso para desenvolvimento.
- Imagem Docker multi-arch (amd64, arm64, arm/v7), CI, release por tag e Dependabot.
