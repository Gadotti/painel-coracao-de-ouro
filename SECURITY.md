# Política de segurança

## Versões suportadas

Só a versão mais recente (tag `latest` da imagem) recebe correções.

## Como reportar

Não abra issue pública para vulnerabilidades. Use o
[reporte privado de vulnerabilidades do GitHub](https://github.com/Gadotti/painel-coracao-de-ouro/security/advisories/new)
com a descrição, os passos para reproduzir e o impacto esperado.

## Escopo

O painel foi desenhado para rodar na rede local e é somente leitura. São especialmente relevantes:

- execução de script ou injeção de HTML/CSS a partir do `status.json` ou do tema;
- vazamento de campos do `status.json` que deveriam ter sido descartados;
- contorno da autenticação HTTP Basic ou do limite de tentativas;
- exposição de detalhes internos (caminhos, stack traces) nas respostas da API.
