# Tech Challenge Fase 04 — Documentação de Entrega

**Aluno:** Matheus Nogueira Silva  
**Projeto:** Aplicativo mobile em React Native da plataforma de blogging (front-end da API do Trabalho 2)  
**Repositório:** https://github.com/matheuskynyrd55-prog/tech-challenge-fase-04

---

## Sobre o projeto

Essa fase evolui o Trabalho 3, que já entregava o front-end web da plataforma de blogging. Agora o objetivo é disponibilizar a mesma experiência em um aplicativo mobile feito em React Native, para que estudantes e docentes possam navegar pelos posts e realizar operações de gerenciamento direto do celular.

O app é apenas o front-end: todos os dados (posts, comentários, curtidas e usuários) vêm da API do Trabalho 2, que ganhou nesta fase o cadastro de usuários no banco de dados.

A ideia foi manter tudo simples e funcional, seguindo o fluxo que já existia no Trabalho 3.

---

## Tecnologias utilizadas

- **React Native + Expo** — aplicativo mobile
- **Fetch API** — integração HTTP com a API do Trabalho 2 (`/api/v1`)
- **AsyncStorage** — guarda apenas a sessão (token JWT) no dispositivo
- **Node Test Runner** — testes automatizados do cliente HTTP
- **GitHub Actions** — CI

O app foi organizado com as telas em `App.js` e a comunicação com a API centralizada em `src/services/api.js` (token Bearer, tratamento de erros, sessão expirada em caso de 401).

---

## Funcionalidades

Base de rotas consumidas da API: `/api/v1`

| Funcionalidade | Descrição |
|--------|------|
| Home | Lista todos os posts (acesso público, sem login) |
| Busca | Filtra posts por palavra-chave |
| Detalhe | Exibe um post específico |
| Criar post | Cadastra nova postagem (docente) |
| Editar post | Atualiza postagem existente (docente) |
| Excluir post | Remove postagem (docente) |
| Login | Autentica docente ou aluno |
| Administração | Lista as postagens para gerenciamento (docente) |
| Cadastros | Lista, cria, edita e exclui usuários (docente) |
| Comentários | Usuário autenticado comenta em post |
| Curtidas | Usuário autenticado curte/descurte post |
| Sessão expirada | Volta para o login automaticamente em caso de 401 |

Credenciais padrão de desenvolvimento (criadas pela API): `docente` / `123456` e `aluno` / `123456`. Os demais usuários (docentes e alunos) são cadastrados por um docente logado, na tela de Cadastros, e ficam salvos no banco da API.

Regras de acesso:

- Visitante: apenas visualiza e busca posts.
- Docente: cria, edita, exclui posts, comenta, curte e gerencia usuários.
- Aluno: comenta e curte.
- Autor de post e comentário é preenchido automaticamente pela API com o usuário autenticado.
- O docente padrão não pode ser excluído e o usuário logado não pode excluir a si mesmo.

---

## Como rodar localmente

Pré-requisitos: Node.js 24+, Docker Desktop, a API do Trabalho 2 em execução e o aplicativo Expo Go no celular (ou um emulador Android/iOS). O computador e o celular precisam estar na mesma rede Wi-Fi.

1. Suba a API do Trabalho 2 (pasta `api/`):

```bash
docker compose up -d db
npm install
npx prisma migrate deploy
npm start
```

2. Libere a porta 3000 no Firewall do Windows (PowerShell como administrador):

```powershell
netsh advfirewall firewall add rule name="API Trabalho 2" dir=in action=allow protocol=TCP localport=3000
```

3. Suba o app (pasta `mobile/`):

```bash
npm install
npm start
```

O app descobre sozinho o IP da rede local do computador que está rodando o Expo e acessa a API em `http://<ip-da-rede>:3000/api/v1`. Para forçar outro endereço, copie `.env.example` para `.env` e ajuste `EXPO_PUBLIC_API_URL`.

O Metro fica fixado na porta 8081. Se ela estiver ocupada, encerre o processo antigo do Expo antes de iniciar novamente, para o app não carregar uma versão antiga.

---

## Testes

Escrevi testes para o cliente HTTP do app: login e tratamento de credenciais inválidas, falha de rede, envio do token Bearer, sessão expirada (401), conversão dos dados de posts e as chamadas de curtidas, comentários e usuários. Para rodar:

```bash
npm run test
```

As regras de usuários (cadastro, edição, exclusão e permissões) são testadas na própria API, no Trabalho 2.

---

## CI/CD

O projeto possui o workflow `.github/workflows/ci-mobile.yml`, que instala as dependências e executa os testes a cada push/pull request. O back-end (Trabalho 2) sobe com `docker compose`, que já aplica as migrações do banco.

---

## Dificuldades e aprendizados

A principal dificuldade foi adaptar o fluxo do Trabalho 3 para a tela do celular, principalmente a navegação inferior, que precisa respeitar os botões do sistema Android, e fazer o celular enxergar a API que roda no computador, já que `localhost` no aparelho não aponta para a máquina de desenvolvimento.

O aprendizado principal foi centralizar a comunicação HTTP em um único módulo testável e usar o IP da rede local, para que o comportamento do app fique previsível e independente da interface.

---

## Uma decisão diferente do Trabalho 3

No Trabalho 3 a API tinha apenas dois usuários fixos. Como o escopo do app inclui cadastro, edição e exclusão de usuários, evoluí a API do Trabalho 2 com uma tabela de usuários (senha criptografada), rotas `/users` restritas a docentes e login consultando o banco, mantendo as contas `docente` e `aluno` como padrão.