# Contrato do `status.json`

O painel não coleta nada sozinho. Um **coletor** que roda no host grava um arquivo JSON e o
servidor do painel o lê, valida e entrega em `GET /api/status`. Este documento descreve o formato
esperado e as regras para quem for escrever um coletor.

Exemplo completo: [`examples/status.example.json`](../examples/status.example.json).

## Regras para o coletor

- **Escrita atômica.** Grave num arquivo temporário e renomeie por cima do definitivo
  (`status.json.tmp` → `status.json`). Assim o painel nunca lê um arquivo pela metade.
- **Grave em tmpfs** (ex.: `/run/coracao-de-ouro/status.json`), não no cartão SD. Uma escrita
  por minuto desgasta o cartão à toa.
- **`gerado_em` é obrigatório** (ISO-8601). O painel usa esse campo para saber se os dados estão
  velhos (padrão: mais de 180 s, configurável em `STATUS_STALE_AFTER_S`).
- **Nada de segredos.** Não coloque tokens, senhas, chat IDs, conteúdo de `.env` ou dados pessoais
  nas mensagens e eventos. O servidor descarta campos desconhecidos, mas os textos (`mensagem`,
  `texto`, `comando`) chegam ao navegador como estão.
- **Tamanho máximo: 1 MiB.** Acima disso o arquivo é recusado.

## Campos

Todos os blocos são opcionais, exceto `gerado_em`. Listas ausentes viram listas vazias. Campos
fora deste contrato são descartados na validação.

### Raiz

| Campo       | Tipo            | Observação                            |
| ----------- | --------------- | ------------------------------------- |
| `gerado_em` | ISO-8601        | **Obrigatório.** Momento da coleta.   |
| `host`      | objeto          | Identificação do servidor.            |
| `hardware`  | objeto          | Leituras do Motor de Improbabilidade. |
| `rede`      | objeto          | Leituras do Peixe Babel.              |
| `agentes`   | lista (até 50)  | Scripts/serviços da Tripulação.       |
| `programas` | lista (até 50)  | Programas e containers do Hangar.     |
| `crons`     | lista (até 100) | Jobs da Burocracia Vogon.             |
| `eventos`   | lista (até 200) | Diário de bordo do Marvin.            |

### `host`

| Campo      | Tipo           | Exemplo                    |
| ---------- | -------------- | -------------------------- |
| `nome`     | texto (64)     | `"nave-exemplo"`           |
| `modelo`   | texto (80)     | `"Raspberry Pi 3 Model B"` |
| `so`       | texto (80)     | `"DietPi"`                 |
| `ip`       | IP sem máscara | `"192.0.2.10"`             |
| `uptime_s` | número ≥ 0     | `1048620`                  |

### `hardware`

| Campo         | Tipo                     | Fonte sugerida no Linux                                            |
| ------------- | ------------------------ | ------------------------------------------------------------------ |
| `cpu_pct`     | 0–100                    | `/proc/stat` (diferença entre duas leituras)                       |
| `temp_c`      | −40–150                  | `vcgencmd measure_temp` ou `/sys/class/thermal/thermal_zone0/temp` |
| `load`        | até 3 números            | `/proc/loadavg`                                                    |
| `ram`, `swap` | `{ usado_mb, total_mb }` | `/proc/meminfo`                                                    |
| `disco`       | `{ usado_gb, total_gb }` | `statvfs("/")`                                                     |
| `throttled`   | `"0x..."`                | `vcgencmd get_throttled`                                           |

### `rede`

| Campo                | Tipo                           | Observação                                                                                       |
| -------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `interface`          | texto (32)                     | `"eth0"`, `"wlan0"`                                                                              |
| `gateway`            | IP                             |                                                                                                  |
| `rx_kbps`, `tx_kbps` | número ≥ 0                     | `/proc/net/dev` (diferença entre leituras)                                                       |
| `ping_ms`            | número ou `null`               | `null` quando não houver resposta                                                                |
| `internet`           | booleano                       |                                                                                                  |
| `dependencias`       | lista de `{ nome, ok, nota? }` | Serviços externos de que os agentes dependem (ex.: a API de um bot). Cada item conta na nota 42. |

### `agentes[]`

| Campo              | Tipo                                   | Observação                                                          |
| ------------------ | -------------------------------------- | ------------------------------------------------------------------- |
| `id`               | `[a-z0-9._-]`, até 64                  | **Obrigatório.** Chave do verbete no tema.                          |
| `estado`           | `ok` \| `aviso` \| `falha` \| `parado` | **Obrigatório.**                                                    |
| `tipo`             | texto (24)                             | `systemd`, `cron`, `docker`…                                        |
| `ultima_atividade` | ISO-8601 ou `null`                     |                                                                     |
| `proxima`          | ISO-8601 ou `null`                     | Se ausente, o painel calcula pelo `cron` ou pelo job de mesmo `id`. |
| `cron`             | expressão cron                         | Opcional.                                                           |
| `mensagem`         | texto (300)                            | Aparece no cartão do agente.                                        |

### `programas[]`

| Campo                  | Tipo            | Observação                                                   |
| ---------------------- | --------------- | ------------------------------------------------------------ |
| `id`, `estado`, `tipo` | como em agentes |                                                              |
| `porta`                | 1–65535         | Gera o botão ABRIR (`http://<host do painel>:<porta>`).      |
| `url`                  | http(s)         | Tem prioridade sobre `porta`. Outros esquemas são recusados. |
| `compartilhamento`     | texto (120)     | Gera o botão COPIAR (ex.: `\\servidor`).                     |
| `cpu_pct`              | 0–800           | `docker stats` soma núcleos.                                 |
| `mem_mb`               | número ≥ 0      |                                                              |
| `desde`                | ISO-8601        | Desde quando está no ar (ou parado).                         |

### `crons[]`

| Campo       | Tipo                                              | Observação                                                                 |
| ----------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| `id`        | como em agentes                                   | **Obrigatório.**                                                           |
| `expressao` | texto (100)                                       | **Obrigatório.** 5 campos ou `@daily`, `@weekly` etc.                      |
| `comando`   | texto (300)                                       | Sem segredos na linha de comando.                                          |
| `ultima`    | ISO-8601 ou `null`                                |                                                                            |
| `duracao_s` | número ≥ 0                                        |                                                                            |
| `resultado` | `ok` \| `falha` \| `rodando` \| `aviso` \| `null` | Vira o carimbo: APROVADO, INDEFERIDO, EM ANÁLISE, COM RESSALVAS, PENDENTE. |
| `proxima`   | ISO-8601 ou `null`                                | Se ausente, o painel calcula.                                              |

### `eventos[]`

| Campo    | Tipo                        | Observação                                             |
| -------- | --------------------------- | ------------------------------------------------------ |
| `ts`     | ISO-8601                    | **Obrigatório.**                                       |
| `nivel`  | `info` \| `aviso` \| `erro` | Padrão `info`.                                         |
| `origem` | texto (64)                  | Id de agente/programa (vira o nome do Guia) ou `host`. |
| `texto`  | texto (300)                 | **Obrigatório.**                                       |

## Respostas da API

| Situação                                       | HTTP | Corpo                                                     |
| ---------------------------------------------- | ---- | --------------------------------------------------------- |
| Status válido                                  | 200  | `{ status, meta: { gerado_em, idade_s, velho, versao } }` |
| Arquivo ausente                                | 503  | `{ erro: "STATUS_INDISPONIVEL", mensagem }`               |
| JSON quebrado, fora do schema ou grande demais | 502  | `{ erro: "STATUS_INVALIDO", mensagem }`                   |

Os detalhes do erro (caminho do arquivo, campo inválido) ficam só no log do servidor.

# Tema (`theme.json`)

Os nomes do Guia vêm de um tema. O padrão fica em
[`src/theme/defaultTheme.json`](../src/theme/defaultTheme.json). Para usar os seus, monte um arquivo
e aponte `THEME_PATH` para ele. Exemplo: [`examples/theme.example.json`](../examples/theme.example.json).

- `agentes`, `programas` e `crons` são **mesclados** por id com o padrão.
- `roadmap`, se informado, **substitui** a lista padrão inteira.
- Cores só no formato `#rrggbb`. Sprites disponíveis: `ghost`, `scared`, `pac`, `heart`, `babel`,
  `marvin`, `deep`, `planet`, `towel`, `zaphod`, `vogon`, `sensomatic`, `qbox`, `whale`, `petunia`.
- Tema inválido não derruba o painel: o servidor usa o padrão e registra o erro no log.
