# Fase 04 - App Mobile em React Native

## Objetivo

Esta pasta contém a aplicação mobile da fase 04, desenvolvida em React Native com Expo.

A solução mantém a base funcional do projeto anterior e reorganiza a experiência para uso em dispositivos móveis.

---

## Funcionalidades implementadas

- login de usuário (professor padrão: `professor` / `123456`);
- listagem e busca de posts;
- detalhe do post, curtidas e comentários;
- administração de posts (criar, editar, excluir) para professores;
- cadastro, edição e exclusão de usuários (professores e alunos) por professores;
- persistência local no dispositivo.

---

## Estrutura principal

- App.js: fluxo principal da aplicação;
- src/services/api.js: persistência local (usuários, postagens e sessão);
- src/services/auth.js: regras de login e cadastro de usuários;
- src/services/auth.test.js: testes das regras de autenticação;
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

Os dados (usuários, postagens e sessão) ficam armazenados localmente no dispositivo; o app não depende de backend.

Testes das regras de autenticação: `node --test src/services/auth.test.js`.
