// Coletor falso para desenvolvimento: grava um status simulado em data/status.json a cada 15 s.
// Uso: npm run dev:coletor-falso -- [calmo|vogons|panico]
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createDemoSimulator, parseScenario } from '../public/js/data/demoStatus.js';

const OUTPUT = process.env.STATUS_PATH || './data/status.json';
const INTERVAL_MS = 15000;

async function writeSnapshot(/** @type {{ next: () => object }} */ simulator) {
  const temporary = `${OUTPUT}.tmp`;
  await writeFile(temporary, JSON.stringify(simulator.next(), null, 2));
  // Troca atômica: o servidor nunca lê um arquivo pela metade (o coletor real deve fazer igual).
  await rename(temporary, OUTPUT);
  console.log(`[${new Date().toLocaleTimeString('pt-BR')}] status gravado em ${OUTPUT}`);
}

async function main() {
  const scenario = parseScenario(process.argv[2] ?? 'calmo');
  if (!scenario) {
    console.error(`Cenário inválido: "${process.argv[2]}". Use calmo, vogons ou panico.`);
    process.exit(1);
  }
  await mkdir(dirname(OUTPUT), { recursive: true });
  const simulator = createDemoSimulator({ scenario });
  await writeSnapshot(simulator);
  setInterval(() => writeSnapshot(simulator), INTERVAL_MS);
}

main();
