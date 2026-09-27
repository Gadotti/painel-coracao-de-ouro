// Gera o valor de PANEL_PASSWORD_HASH. A senha é lida do terminal sem eco (ou da entrada padrão).
import { createInterface } from 'node:readline';
import { hashPassword } from '../src/auth/passwordHasher.js';

const MIN_PASSWORD_LENGTH = 12;

/**
 * @param {string} question
 * @returns {Promise<string>}
 */
function askHidden(question) {
  const terminal = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  // readline não tem opção de "sem eco"; o hook interno _writeToOutput só deixa passar a pergunta.
  const hookable = /** @type {{ _writeToOutput: (text: string) => void }} */ (
    /** @type {unknown} */ (terminal)
  );
  const writeOriginal = hookable._writeToOutput.bind(terminal);
  hookable._writeToOutput = (text) => {
    if (text.includes(question)) writeOriginal(text);
  };
  return new Promise((resolve) =>
    terminal.question(question, (answer) => {
      terminal.close();
      process.stdout.write('\n');
      resolve(answer);
    }),
  );
}

async function main() {
  const password = await askHidden('Senha do painel: ');
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(
      `A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres (recebido: ${password.length}).`,
    );
    process.exit(1);
  }
  const confirmation = await askHidden('Repita a senha: ');
  if (confirmation !== password) {
    console.error('As senhas não conferem.');
    process.exit(1);
  }
  console.log('\nColoque no .env / docker-compose (sem aspas):');
  console.log(`PANEL_PASSWORD_HASH=${await hashPassword(password)}`);
}

main();
