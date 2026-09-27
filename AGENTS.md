# AGENTS.md

Regras de "como trabalhamos aqui". As seções de padrões, testes, segurança e Git valem para
qualquer projeto; as primeiras descrevem este.

## Visão geral do projeto

**Coração de Ouro** é um painel de controle 8-bit, somente leitura, para servidores caseiros
(Raspberry Pi), com o tema do _Guia do Mochileiro das Galáxias_. Um coletor externo (fora deste
repositório) grava um `status.json` no host; este projeto valida esse arquivo e o exibe.

- **Stack:** Node.js 22 (ES modules), Express 5, Joi, Helmet, express-rate-limit.
- **Front:** HTML/CSS/ES modules servidos estáticos. **Sem bundler e sem etapa de build.**
- **Tipos:** JSDoc checado por `tsc --noEmit` (`checkJs`, `noImplicitAny`).
- **Testes:** Jest (ESM), supertest para HTTP, jsdom para o front.
- **Infra:** Docker multi-arch (amd64, arm64, arm/v7) publicado no GHCR; GitHub Actions.
- **Banco de dados:** nenhum. O estado é o `status.json` do coletor mais o histórico curto no navegador.
- **Repositório público:** exemplos e fixtures usam só dados fictícios (host `nave-exemplo`, IPs
  RFC 5737 como `192.0.2.10`). Nunca commite nomes de host, IPs, usuários ou tokens reais.

## Comandos

```bash
npm install                                  # Instalar dependências
npm run dev                                  # Servidor com reload (http://localhost:4242)
npm run dev:coletor-falso -- panico          # Status simulado em data/status.json (calmo|vogons|panico)
npm start                                    # Produção
npm test                                     # Toda a suíte
npm test -- tests/unit/lib/cron.test.js      # Um único arquivo
npm run check                                # format:check + lint + typecheck + test:coverage (igual ao CI)
npm run hash-password                        # Gera PANEL_PASSWORD_HASH
npm version patch|minor|major && git push --follow-tags   # Release (dispara o workflow)
```

## Arquitetura

```
coletor (host, cron) ──grava──▶ status.json (tmpfs, montado :ro)
                                     │
src/status/statusService ──lê/valida (statusSchema: Joi, stripUnknown)
src/theme/themeService   ──tema padrão + THEME_PATH (mesclado)
src/api/routes           ──/api/status  /api/theme  /healthz
src/app.js               ──monta tudo com dependências injetadas (buildApp)
        │ HTTP (fetch a cada 15 s)
public/js/data/panelController ──estado da conexão + histórico
public/js/render/*       ──um módulo por painel, HTML como string escapada
public/js/lib/*          ──lógica pura: cron, nota 42, formatos, rota do dia
```

- `public/js/lib`, `sprites` e `data/demoStatus.js` são usados pelo servidor e pelos testes
  também (o pacote inteiro é ESM).
- O HTML injetado **nunca** usa `style=""` (o CSP bloqueia). Posições e cores vão em `data-pos` e
  `data-color`, aplicados por `applyDataStyles` via CSSOM.
- Todo texto de fora (status, tema) passa por `escapeHtml`; URLs por `safeHttpUrl`; cores por
  `safeColor`.
- Modo simulação só com `?demo`/`?cenario=`. Nunca automático: dado falso escondendo uma queda
  do coletor seria pior que painel vazio.

---

## Padrões de código

### Princípios inegociáveis

- **Clean Code**: nomes descritivos, funções pequenas e com uma única responsabilidade, sem números/strings mágicos, sem comentários que só repetem o código.
- **SOLID**: todo código novo ou revisado deve ser avaliado contra os 5 princípios.
- **Testes acompanham código**: nenhuma lógica de negócio nova sem teste correspondente.

### Estilo

- Funções: 4–20 linhas. Arquivos: até 500 linhas. Divida por responsabilidade (SRP).
- Nomes específicos e únicos. Evite `data`, `handler`, `Manager`; prefira nomes com menos de 5 ocorrências no grep.
- Tipos explícitos (JSDoc). Sem `any`/`Dict` genérico, sem função sem tipagem.
- Early returns em vez de ifs aninhados. Máximo de 3 níveis de indentação (ESLint `max-depth`).
- Sem duplicação: extraia lógica compartilhada para função/módulo.
- Mensagens de exceção devem incluir o valor recebido e o formato esperado.
- Sem números/strings mágicos: use constante nomeada ou config.
- Sem código morto (função/bloco não usado) e sem código comentado.
- No máximo ~3 parâmetros por função (ESLint `max-params`); mais que isso, agrupe em objeto.
- Formatação automática (Prettier + ESLint) roda no CI e quebra o build se divergir.

### Comentários

- Comente o **porquê**, não o **o quê**; o código já diz o que faz.
- Não remova comentários existentes só por refatorar: eles carregam intenção/contexto.
- Docstrings em funções públicas: intenção + um exemplo de uso (`@example`).
- Referencie issue/commit quando a linha existir por causa de um bug específico ou restrição externa.

### Dependências

- Injete dependências via construtor/parâmetro, nunca via import global (ex.: `buildApp`, `createStatusService({ fileSystem })`).
- Encapsule bibliotecas de terceiros atrás de uma interface própria (Joi só em `*Schema.js`; `express-rate-limit` só em `authRateLimit.js`).

### Estrutura

- Siga a convenção do framework usado.
- Prefira módulos pequenos e focados a arquivos "deus".
- Caminhos previsíveis: `src/{api,middleware,status,theme,auth,lib}`, `public/js/{lib,render,data,sprites,effects}`, `tests/{unit,integration,frontend,fakes,helpers}`.

### Logging

- JSON estruturado (`src/logger.js`) para logs de debug/observabilidade.
- Texto plano apenas para saída voltada ao usuário (scripts de CLI em `scripts/`).

---

## Testes

- Toda função nova tem teste. Todo bug corrigido ganha teste de regressão.
- Testes devem ser F.I.R.S.T: rápidos, independentes, repetíveis, auto-validáveis e feitos a tempo.
- Mock de I/O externo (API, banco, filesystem) com fakes nomeados, não stubs inline: `tests/fakes/` (`FakeFileSystem`, `RecordingLogger`, `ScriptedFetch`).
- Cobertura mínima global de 90% (linhas, funções, statements) e 85% (branches), aplicada pelo Jest.
- Datas em testes de cron usam horário local (`new Date(2026, 8, 27, 10, 0)`) para valer em qualquer fuso.

### Fluxo de teste após alteração

Após cada mudança de código, rode `npm run check` e inspecione a saída. Se algo falhar:

1. Leia a mensagem de falha e identifique a causa raiz.
2. Corrija o código; se o problema for o teste, corrija o teste (nunca desative ou apague um teste que falha).
3. Rode os testes de novo.
4. Repita até tudo passar antes de considerar a tarefa concluída.

---

## Segurança (inegociável)

- Nunca commitar segredos, chaves, tokens ou credenciais (`.env` etc.). Segredo commitado por engano deve ser rotacionado, não apenas removido.
- Validar e sanitizar toda entrada externa; nunca confiar em dados vindos do cliente. Trate path/URL/comando com risco de injeção (SQL, shell, path traversal) com a mesma desconfiança.
- Senhas: hash com custo adequado (aqui: scrypt N=2¹⁵, r=8). Chaves/API keys: armazenadas com hash.
- Acesso a banco: apenas prepared statements; nunca concatenar/interpolar SQL.
- Checar vulnerabilidades conhecidas antes de introduzir uma dependência nova (`npm audit`; o npm deste ambiente só aceita versões com 7+ dias).
- **Autorização por request, negar por padrão**: verifique a permissão a cada chamada; nunca confie em identificador de usuário/role vindo do payload do cliente.
- **Erro para o cliente sem detalhe interno**: sem stack trace, caminho de arquivo ou mensagem de exceção crua na resposta HTTP/API.
- **Autenticação:** comparação de segredo/token em tempo constante (nunca `==` simples) e rate limiting em endpoints de login.
- **Logging de auditoria sim, segredo não**: registre quem/o quê/quando em ações sensíveis, mas nunca logue senha, token, chave ou dado pessoal sensível.
- **Requisições de saída (SSRF):** validar/whitelistar host antes de chamar URL vinda de config ou input; bloquear IP privado/loopback/link-local. (Hoje o servidor não faz requisições de saída.)
- Credenciais usadas como fixture de teste devem ser sempre valores obviamente falsos e inválidos (ex. `"123456789:TESTE-FAKE-TOKEN"`), nunca uma credencial real colada durante o desenvolvimento, mesmo que o serviço nunca seja chamado de verdade no teste.

## Git

- Conventional Commits, branches curtas, PRs pequenos e revisáveis.
- Nunca `push --force` em branches compartilhadas (main/develop).
- Nenhum PR é aprovado sem passar por revisão de código e checklist de segurança.

### Checklist antes de cada commit

1. Formatter/linter sem divergência (`npm run format:check && npm run lint`).
2. Tipos sem erro (`npm run typecheck`).
3. Suíte de testes verde com cobertura mínima (`npm run test:coverage`).
4. Scan de dependências vulneráveis sem apontamento novo (`npm audit --omit=dev`).
5. Diff revisado: sem segredo, sem `console.log` de debug, sem código comentado, sem dado pessoal em exemplos.
