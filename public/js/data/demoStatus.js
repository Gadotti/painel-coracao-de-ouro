// Simulação com dados fictícios (host, IPs de documentação RFC 5737, ids genéricos).
// Usada pelo modo ?demo do navegador e pelo coletor falso de desenvolvimento.

/** @typedef {import('../types.js').PanelStatus} PanelStatus */
/** @typedef {'calmo' | 'vogons' | 'panico'} DemoScenario */

export const DEMO_SCENARIOS = /** @type {const} */ (['calmo', 'vogons', 'panico']);

const MINUTE = 60000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const BACKUP_HOUR = 3;
const CLEANUP_HOUR = 4;
const CLEANUP_MINUTE = 30;
const SUNDAY = 0;
const RAM_TOTAL_MB = 921;
const SWAP_TOTAL_MB = 1024;
const DISK_TOTAL_GB = 29.1;
const UPTIME_S = 12 * 86400 + 3 * 3600 + 17 * 60;

/**
 * @typedef {object} SimulatedSensors
 * @property {number} cpu
 * @property {number} temp
 * @property {number} ram
 * @property {number} rx
 * @property {number} tx
 * @property {number} ping
 */

/**
 * Faixas do passeio aleatório de cada sensor, por cenário.
 * @type {Record<DemoScenario, Record<keyof SimulatedSensors, [number, number]>>}
 */
const SENSOR_RANGES = {
  calmo: { cpu: [3, 40], temp: [46, 58], ram: [420, 760], rx: [20, 1400], tx: [5, 400], ping: [9, 35] },
  vogons: { cpu: [20, 75], temp: [60, 73], ram: [520, 800], rx: [20, 1400], tx: [5, 400], ping: [9, 90] },
  panico: { cpu: [70, 99], temp: [76, 84], ram: [820, 910], rx: [0, 30], tx: [0, 10], ping: [9, 90] },
};
const SENSOR_STEPS = { cpu: 14, temp: 1.6, ram: 30, rx: 160, tx: 60, ping: 6 };

/**
 * @param {Date} now
 * @returns {Date}
 */
function lastSundayBackup(now) {
  const moment = new Date(now);
  moment.setHours(BACKUP_HOUR, 0, 0, 0);
  while (moment.getDay() !== SUNDAY || moment > now) moment.setDate(moment.getDate() - 1);
  return moment;
}

/**
 * @param {Date} now
 * @returns {Date}
 */
function lastCleanup(now) {
  const moment = new Date(now);
  moment.setHours(CLEANUP_HOUR, CLEANUP_MINUTE, 0, 0);
  if (moment > now) moment.setDate(moment.getDate() - 1);
  return moment;
}

/**
 * @param {DemoScenario} scenario
 * @param {Date} now
 * @returns {Pick<PanelStatus, 'agentes' | 'programas'>}
 */
function demoFleet(scenario, now) {
  const troubled = scenario !== 'calmo';
  const panic = scenario === 'panico';
  const iso = (/** @type {number} */ offsetMs) => new Date(now.getTime() - offsetMs).toISOString();
  const backupEnd = new Date(lastSundayBackup(now).getTime() + 18 * MINUTE).toISOString();
  return {
    agentes: [
      {
        id: 'bot-telegram',
        tipo: 'systemd',
        estado: panic ? 'falha' : 'ok',
        ultima_atividade: iso((panic ? 47 : 4) * MINUTE),
        mensagem: panic ? 'sem resposta da API do chat há 47 min' : 'long polling ativo · último comando: /status',
      },
      {
        id: 'backup-sd',
        tipo: 'cron',
        estado: troubled ? 'falha' : 'ok',
        ultima_atividade: backupEnd,
        mensagem: troubled ? 'disco de destino não encontrado, clone abortado' : 'clone concluído em 18 min, sem erros',
      },
    ],
    programas: [
      { id: 'analisador', tipo: 'docker', estado: 'ok', porta: 8765, cpu_pct: 1.2, mem_mb: 96, desde: iso(3 * DAY) },
      {
        id: 'portainer',
        tipo: 'docker',
        estado: panic ? 'parado' : 'ok',
        porta: 9000,
        cpu_pct: 0.4,
        mem_mb: 38,
        desde: iso(panic ? 26 * MINUTE : 12 * DAY),
      },
      { id: 'cronitor-dash', tipo: 'systemd', estado: 'ok', porta: 9001, desde: iso(12 * DAY) },
      { id: 'dietpi-dashboard', tipo: 'systemd', estado: troubled ? 'aviso' : 'ok', porta: 5252, desde: iso(12 * DAY) },
      { id: 'samba', tipo: 'systemd', estado: 'ok', compartilhamento: '\\\\nave-exemplo', desde: iso(12 * DAY) },
    ],
  };
}

/**
 * @param {DemoScenario} scenario
 * @param {Date} now
 * @returns {PanelStatus['crons']}
 */
function demoCrons(scenario, now) {
  const troubled = scenario !== 'calmo';
  return [
    {
      id: 'backup-sd',
      expressao: '0 3 * * 0',
      comando: 'python3 /opt/agentes/backup_sd.py',
      ultima: lastSundayBackup(now).toISOString(),
      duracao_s: troubled ? 4 : 1080,
      resultado: troubled ? 'falha' : 'ok',
    },
    {
      id: 'coletor-painel',
      expressao: '* * * * *',
      comando: 'python3 /opt/agentes/coletor.py',
      ultima: new Date(now.getTime() - 30000).toISOString(),
      duracao_s: 1,
      resultado: 'ok',
    },
    {
      id: 'faxina-docker',
      expressao: '30 4 * * *',
      comando: 'docker image prune -f',
      ultima: lastCleanup(now).toISOString(),
      duracao_s: 9,
      resultado: 'ok',
    },
  ];
}

/**
 * @param {DemoScenario} scenario
 * @param {Date} now
 * @returns {PanelStatus['eventos']}
 */
function demoEvents(scenario, now) {
  const troubled = scenario !== 'calmo';
  const iso = (/** @type {number} */ offsetMs) => new Date(now.getTime() - offsetMs).toISOString();
  const backupEnd = new Date(lastSundayBackup(now).getTime() + 18 * MINUTE).toISOString();
  /** @type {PanelStatus['eventos']} */
  const events = [
    { ts: iso(4 * MINUTE), nivel: 'info', origem: 'bot-telegram', texto: '/status recebido, 5 serviços listados' },
    { ts: iso(3 * HOUR), nivel: 'info', origem: 'analisador', texto: 'relatório mensal gerado' },
    { ts: iso(DAY + 2 * HOUR), nivel: 'info', origem: 'portainer', texto: 'imagem atualizada para a última versão' },
    { ts: iso(2 * DAY), nivel: 'aviso', origem: 'host', texto: 'núcleo ficou acima de 68 °C por 5 min' },
    troubled
      ? { ts: backupEnd, nivel: 'erro', origem: 'backup-sd', texto: 'clone falhou: disco de destino não existe' }
      : { ts: backupEnd, nivel: 'info', origem: 'backup-sd', texto: 'clone concluído: disco sincronizado' },
  ];
  if (troubled) {
    events.push({ ts: iso(40 * MINUTE), nivel: 'aviso', origem: 'host', texto: 'subtensão detectada desde o boot (fonte fraca?)' });
    events.push({ ts: iso(25 * MINUTE), nivel: 'aviso', origem: 'dietpi-dashboard', texto: 'resposta lenta (2,8 s)' });
  }
  if (scenario === 'panico') {
    events.push({ ts: iso(26 * MINUTE), nivel: 'erro', origem: 'portainer', texto: 'container parou (exit 137, sem memória)' });
    events.push({ ts: iso(47 * MINUTE), nivel: 'erro', origem: 'bot-telegram', texto: 'timeout na API do chat' });
    events.push({ ts: iso(9 * MINUTE), nivel: 'erro', origem: 'host', texto: 'sem rota para a internet' });
  }
  return events;
}

/**
 * @param {DemoScenario} scenario
 * @param {SimulatedSensors} sensors
 * @returns {Pick<PanelStatus, 'hardware' | 'rede'>}
 */
function demoReadings(scenario, sensors) {
  const panic = scenario === 'panico';
  const troubled = scenario !== 'calmo';
  const round2 = (/** @type {number} */ value) => Math.round(value * 100) / 100;
  return {
    hardware: {
      cpu_pct: round2(sensors.cpu),
      temp_c: round2(sensors.temp),
      load: [sensors.cpu / 25, sensors.cpu / 30, sensors.cpu / 35].map(round2),
      ram: { usado_mb: Math.round(sensors.ram), total_mb: RAM_TOTAL_MB },
      swap: { usado_mb: panic ? 870 : troubled ? 310 : 96, total_mb: SWAP_TOTAL_MB },
      disco: { usado_gb: panic ? 27.1 : 9.8, total_gb: DISK_TOTAL_GB },
      throttled: panic ? '0x50005' : troubled ? '0x50000' : '0x0',
    },
    rede: {
      interface: 'eth0',
      gateway: '192.0.2.1',
      rx_kbps: Math.round(sensors.rx),
      tx_kbps: Math.round(sensors.tx),
      ping_ms: panic ? null : Math.round(sensors.ping),
      internet: !panic,
      dependencias: [{ nome: 'api do chat', ok: !panic, nota: 'Eddie depende disto' }],
    },
  };
}

/**
 * @param {DemoScenario} scenario
 * @returns {SimulatedSensors}
 */
function initialSensors(scenario) {
  const ranges = SENSOR_RANGES[scenario];
  const middle = (/** @type {[number, number]} */ [low, high]) => (low + high) / 2;
  return {
    cpu: middle(ranges.cpu),
    temp: middle(ranges.temp),
    ram: middle(ranges.ram),
    rx: middle(ranges.rx),
    tx: middle(ranges.tx),
    ping: middle(ranges.ping),
  };
}

/**
 * Gera status fictícios que variam a cada chamada, como um coletor de verdade.
 * @param {{ scenario: DemoScenario, random?: () => number, clock?: () => Date }} options
 * @returns {{ next: () => PanelStatus, scenario: DemoScenario }}
 * @example createDemoSimulator({ scenario: 'calmo' }).next().host.nome // 'nave-exemplo'
 */
export function createDemoSimulator({ scenario, random = Math.random, clock = () => new Date() }) {
  const sensors = initialSensors(scenario);
  const ranges = SENSOR_RANGES[scenario];
  const walk = () => {
    for (const key of /** @type {Array<keyof SimulatedSensors>} */ (Object.keys(sensors))) {
      const [low, high] = ranges[key];
      const step = (random() - 0.5) * SENSOR_STEPS[key];
      sensors[key] = Math.max(low, Math.min(high, sensors[key] + step));
    }
  };
  return {
    scenario,
    next() {
      walk();
      const now = clock();
      return {
        gerado_em: now.toISOString(),
        host: { nome: 'nave-exemplo', modelo: 'Raspberry Pi 3 Model B', so: 'DietPi', ip: '192.0.2.10', uptime_s: UPTIME_S },
        ...demoReadings(scenario, sensors),
        ...demoFleet(scenario, now),
        crons: demoCrons(scenario, now),
        eventos: demoEvents(scenario, now),
      };
    },
  };
}

/**
 * @param {string | null} value
 * @returns {DemoScenario | null}
 * @example parseScenario('panico') // 'panico'
 */
export function parseScenario(value) {
  return DEMO_SCENARIOS.includes(/** @type {DemoScenario} */ (value)) ? /** @type {DemoScenario} */ (value) : null;
}
