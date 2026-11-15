import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.EXPO_PUBLIC_API_URL = 'http://192.168.0.10:3000/api/v1/';

const api = await import('./api.js');

const calls = [];
let responder = null;

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, options, body: options.body ? JSON.parse(options.body) : undefined });
  return responder(url, options);
};

const loginAsTeacher = async () => {
  responder = () =>
    jsonResponse(200, {
      token: 'jwt-token',
      user: { id: 'u1', username: 'docente', name: 'Docente', role: 'docente' },
    });
  await api.loginUser('docente', '123456');
  calls.length = 0;
};

beforeEach(async () => {
  await api.clearSession();
  api.setUnauthorizedHandler(null);
  calls.length = 0;
  responder = null;
});

test('login usa o IP configurado, grava a sessão e devolve o usuário', async () => {
  responder = () =>
    jsonResponse(200, {
      token: 'jwt-token',
      user: { id: 'u1', username: 'docente', name: 'Docente', role: 'docente' },
    });

  const session = await api.loginUser('docente', '123456');

  assert.equal(calls[0].url, 'http://192.168.0.10:3000/api/v1/auth/login');
  assert.deepEqual(calls[0].body, { username: 'docente', password: '123456' });
  assert.equal(session.user.role, 'docente');
  assert.equal((await api.loadSession()).token, 'jwt-token');
});

test('login com senha errada devolve mensagem amigável e não grava sessão', async () => {
  responder = () => jsonResponse(401, { message: 'Credenciais invalidas' });

  await assert.rejects(() => api.loginUser('docente', 'errada'), { message: 'Credenciais inválidas.' });
  assert.equal(await api.loadSession(), null);
});

test('falha de rede devolve mensagem orientando verificar API e Wi-Fi', async () => {
  responder = () => {
    throw new TypeError('Network request failed');
  };

  await assert.rejects(() => api.fetchPosts(), /API está em execução/);
});

test('requisições autenticadas enviam o token Bearer', async () => {
  await loginAsTeacher();
  responder = () => jsonResponse(201, { id: 'p1', title: 'Titulo', content: 'Conteudo longo', author: 'docente' });

  const post = await api.createPost({ title: 'Titulo', content: 'Conteudo longo' });

  assert.equal(calls[0].options.headers.Authorization, 'Bearer jwt-token');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(post.id, 'p1');
});

test('resposta 401 em rota autenticada encerra a sessão e avisa o app', async () => {
  await loginAsTeacher();
  let expired = false;
  api.setUnauthorizedHandler(() => {
    expired = true;
  });
  responder = () => jsonResponse(401, { message: 'Token invalido ou expirado' });

  await assert.rejects(() => api.getUsers(), { status: 401 });
  assert.equal(expired, true);
  assert.equal(await api.loadSession(), null);
});

test('lista de posts converte curtidas e quantidade de comentários da API', async () => {
  responder = () =>
    jsonResponse(200, [
      {
        id: 'p1',
        title: 'Post',
        content: 'Conteudo',
        author: 'docente',
        likes: [{ author: 'aluno' }],
        _count: { comments: 3 },
      },
    ]);

  const [post] = await api.fetchPosts();

  assert.equal(post.likes, 1);
  assert.deepEqual(post.likedBy, ['aluno']);
  assert.equal(post.commentsCount, 3);
});

test('curtir e comentar usam as rotas do post', async () => {
  await loginAsTeacher();
  responder = () => jsonResponse(200, { liked: true, likesCount: 2 });
  const like = await api.toggleLike('p1');
  assert.equal(calls[0].url, 'http://192.168.0.10:3000/api/v1/posts/p1/likes');
  assert.deepEqual(like, { liked: true, likesCount: 2 });

  responder = () => jsonResponse(201, { id: 'c1', author: 'docente', content: 'Muito bom', createdAt: 'x' });
  const comment = await api.addComment('p1', 'Muito bom');
  assert.equal(calls[1].url, 'http://192.168.0.10:3000/api/v1/posts/p1/comments');
  assert.equal(comment.content, 'Muito bom');
});

test('cadastro, edição e exclusão de usuários usam /users e não enviam senha vazia', async () => {
  await loginAsTeacher();

  responder = () => jsonResponse(201, { id: 'u2', username: 'maria', name: 'Maria', role: 'aluno' });
  const created = await api.registerUser({ name: 'Maria', username: 'maria', password: 'abc123', role: 'aluno' });
  assert.equal(calls[0].url, 'http://192.168.0.10:3000/api/v1/users');
  assert.equal(created.user.id, 'u2');

  responder = () => jsonResponse(200, { id: 'u2', username: 'maria', name: 'Maria S.', role: 'aluno' });
  await api.editUser({ id: 'u2', name: 'Maria S.', password: '', role: 'aluno' });
  assert.equal(calls[1].options.method, 'PUT');
  assert.deepEqual(calls[1].body, { name: 'Maria S.', role: 'aluno' });

  responder = () => jsonResponse(204, null);
  await api.removeUser('u2');
  assert.equal(calls[2].url, 'http://192.168.0.10:3000/api/v1/users/u2');
  assert.equal(calls[2].options.method, 'DELETE');
});

test('erros de validação da API mostram as mensagens dos campos', async () => {
  await loginAsTeacher();
  responder = () =>
    jsonResponse(400, {
      error: 'validation_error',
      message: 'Dados invalidos',
      details: [{ path: 'username', message: 'username deve ter pelo menos 3 caracteres' }],
    });

  await assert.rejects(
    () => api.registerUser({ name: 'A', username: 'x', password: '1', role: 'aluno' }),
    /username deve ter pelo menos 3 caracteres/,
  );
});
