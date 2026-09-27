// Gera _deploys/<versão>.zip a partir do commit atual (git archive).
// O que fica de fora do pacote é definido com `export-ignore` no .gitattributes.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

const OUTPUT_DIR = '_deploys';

function main() {
  const { name, version } = JSON.parse(readFileSync('package.json', 'utf8'));
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const output = `${OUTPUT_DIR}/${name}-${version}.zip`;
  execFileSync('git', ['archive', '--format=zip', `--prefix=${name}-${version}/`, '-o', output, 'HEAD'], {
    stdio: 'inherit',
  });
  console.log(`Release criado: ${output}`);
}

main();
