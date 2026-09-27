// Tipos compartilhados (JSDoc) entre front, servidor e testes. Não há código executável aqui.

/** @typedef {'ok' | 'aviso' | 'falha' | 'parado'} UnitState */
/** @typedef {'ok' | 'falha' | 'rodando' | 'aviso' | null} CronResult */
/** @typedef {'info' | 'aviso' | 'erro'} EventLevel */

/**
 * @typedef {object} HostInfo
 * @property {string} [nome]
 * @property {string} [modelo]
 * @property {string} [so]
 * @property {string} [ip]
 * @property {number} [uptime_s]
 */

/**
 * @typedef {object} MemoryUsage
 * @property {number} usado_mb
 * @property {number} total_mb
 */

/**
 * @typedef {object} HardwareInfo
 * @property {number} [cpu_pct]
 * @property {number} [temp_c]
 * @property {number[]} [load]
 * @property {MemoryUsage} [ram]
 * @property {MemoryUsage} [swap]
 * @property {{ usado_gb: number, total_gb: number }} [disco]
 * @property {string} [throttled]
 */

/**
 * @typedef {object} ExternalDependency
 * @property {string} nome
 * @property {boolean} ok
 * @property {string} [nota]
 */

/**
 * @typedef {object} NetworkInfo
 * @property {string} [interface]
 * @property {string} [gateway]
 * @property {number} [rx_kbps]
 * @property {number} [tx_kbps]
 * @property {number | null} [ping_ms]
 * @property {boolean} [internet]
 * @property {ExternalDependency[]} [dependencias]
 */

/**
 * @typedef {object} AgentStatus
 * @property {string} id
 * @property {string} [tipo]
 * @property {UnitState} estado
 * @property {string | null} [ultima_atividade]
 * @property {string | null} [proxima]
 * @property {string} [cron]
 * @property {string} [mensagem]
 */

/**
 * @typedef {object} ProgramStatus
 * @property {string} id
 * @property {string} [tipo]
 * @property {UnitState} estado
 * @property {number} [porta]
 * @property {string} [url]
 * @property {string} [compartilhamento]
 * @property {number} [cpu_pct]
 * @property {number} [mem_mb]
 * @property {string} [desde]
 */

/**
 * @typedef {object} CronStatus
 * @property {string} id
 * @property {string} expressao
 * @property {string} [comando]
 * @property {string | null} [ultima]
 * @property {number} [duracao_s]
 * @property {CronResult} [resultado]
 * @property {string | null} [proxima]
 */

/**
 * @typedef {object} PanelEvent
 * @property {string} ts
 * @property {EventLevel} nivel
 * @property {string} [origem]
 * @property {string} texto
 */

/**
 * @typedef {object} PanelStatus
 * @property {string} gerado_em
 * @property {HostInfo} host
 * @property {HardwareInfo} hardware
 * @property {NetworkInfo} rede
 * @property {AgentStatus[]} agentes
 * @property {ProgramStatus[]} programas
 * @property {CronStatus[]} crons
 * @property {PanelEvent[]} eventos
 */

/**
 * @typedef {object} StatusMeta
 * @property {string} gerado_em
 * @property {number} idade_s
 * @property {boolean} velho
 * @property {string} versao
 */

/**
 * @typedef {object} AgentTheme
 * @property {string} nome
 * @property {string} papel
 * @property {string} cor
 * @property {string} desc
 * @property {string[]} frases
 */

/**
 * @typedef {object} ProgramTheme
 * @property {string} nome
 * @property {string} sprite
 * @property {string} cor
 * @property {string} desc
 * @property {string} frase
 */

/**
 * @typedef {object} RoadmapItem
 * @property {string} nome
 * @property {string} real
 * @property {string} sprite
 * @property {string} desc
 */

/**
 * @typedef {object} PanelTheme
 * @property {Record<string, AgentTheme>} agentes
 * @property {Record<string, ProgramTheme>} programas
 * @property {Record<string, string>} crons
 * @property {RoadmapItem[]} roadmap
 */

/** @typedef {'aguardando' | 'ao-vivo' | 'sem-sinal' | 'sem-conexao' | 'simulacao'} ConnectionState */

/**
 * @typedef {object} HealthCheck
 * @property {boolean} ok
 * @property {string} descricao
 */

/** @typedef {'' | 'warn' | 'bad'} HealthLevel */

/**
 * @typedef {object} HealthResult
 * @property {HealthCheck[]} checks
 * @property {HealthCheck[]} failures
 * @property {number} score
 * @property {HealthLevel} level
 */

export {};
