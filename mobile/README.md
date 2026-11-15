# Fase 04 - App Mobile em React Native

## Objetivo

Esta pasta contém a aplicação mobile da fase 04, desenvolvida em React Native com Expo.

A solução mantém a base funcional do projeto anterior e reorganiza a experiência para uso em dispositivos móveis.

---

## Funcionalidades implementadas

- login de usuário (padrão: `docente` / `123456` ou `aluno` / `123456`);
- listagem e busca de posts;
- detalhe do post, curtidas e comentários;
- administração de posts (criar, editar, excluir) para docentes;
- cadastro, edição e exclusão de usuários (docentes e alunos) por docentes;
- todos os dados vêm da API do Trabalho 2; o dispositivo guarda apenas a sessão.

---

## Estrutura principal

- App.js: fluxo principal da aplicação;
- src/services/api.js: cliente HTTP da API (token Bearer, sessão e tratamento de erros);
- src/services/api.test.js: testes do cliente HTTP;
- app.json: configuração do Expo;
- babel.config.js: configuração do Babel.

---

## Como rodar

```bash
npm install
npm start
```

O Metro fica fixado na porta 8081 para evitar que o Expo abra outra instância em uma porta diferente e carregue uma versão antiga do app.

Se a porta 8081 estiver ocupada, encerre o processo antigo do Expo/Metro antes de iniciar novamente. Isso evita que o bundler troque de porta e carregue uma versão antiga do projeto.

Se for necessário iniciar manualmente:

```bash
npx expo start --port 8081 --clear
```

---

## Observações

O app precisa da API do Trabalho 2 em execução (porta 3000) e do celular na mesma rede Wi-Fi do computador. Ele usa automaticamente o IP da rede local da máquina que roda o Expo; para forçar outro endereço, copie `.env.example` para `.env` e ajuste `EXPO_PUBLIC_API_URL`. Se o celular não conseguir conectar, libere a porta 3000 no Firewall do Windows.

Testes do cliente HTTP: `npm run test`.
