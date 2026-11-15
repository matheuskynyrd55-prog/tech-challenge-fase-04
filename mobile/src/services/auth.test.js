import test from 'node:test';
import assert from 'node:assert/strict';
import authModule from './auth.js';
import { clearSession } from './api.js';

const { createUserAccount, loginLocalUser, updateUserAccount, deleteUserAccount } = authModule;

test('professor edita usuário mantendo a senha quando em branco e aluno não pode editar', () => {
  const store = {
    users: [
      { username: 'professor', password: '123456', role: 'docente', name: 'Professor' },
      { username: 'aluno01', password: 'abc123', role: 'aluno', name: 'Aluno 01' },
    ],
  };

  assert.throws(
    () => updateUserAccount({ username: 'aluno01', name: 'X', actorRole: 'aluno', store }),
    /Apenas professores/i,
  );

  const updated = updateUserAccount({
    username: 'aluno01',
    name: 'Aluno Novo',
    password: '',
    role: 'docente',
    actorRole: 'docente',
    store,
  });

  assert.equal(updated.name, 'Aluno Novo');
  assert.equal(updated.role, 'docente');
  assert.equal(updated.password, 'abc123');

  assert.throws(
    () => updateUserAccount({ username: 'professor', role: 'aluno', actorRole: 'docente', store }),
    /permanecer como professor/i,
  );
});

test('professor exclui usuário, exceto o professor padrão e o próprio usuário', () => {
  const store = {
    users: [
      { username: 'professor', password: '123456', role: 'docente', name: 'Professor' },
      { username: 'prof02', password: '123456', role: 'docente', name: 'Prof 02' },
      { username: 'aluno01', password: 'abc123', role: 'aluno', name: 'Aluno 01' },
    ],
  };

  assert.throws(
    () => deleteUserAccount({ username: 'aluno01', actorRole: 'aluno', actorUsername: 'aluno01', store }),
    /Apenas professores/i,
  );
  assert.throws(
    () => deleteUserAccount({ username: 'professor', actorRole: 'docente', actorUsername: 'prof02', store }),
    /padrão/i,
  );
  assert.throws(
    () => deleteUserAccount({ username: 'prof02', actorRole: 'docente', actorUsername: 'prof02', store }),
    /próprio usuário/i,
  );

  deleteUserAccount({ username: 'aluno01', actorRole: 'docente', actorUsername: 'professor', store });
  assert.equal(store.users.some((user) => user.username === 'aluno01'), false);
});

test('deve rejeitar credenciais desconhecidas sem fallback automático', () => {
  const store = { users: [] };

  assert.throws(
    () => loginLocalUser({ username: 'qualquer', password: '123', store }),
    /Credenciais inválidas/i,
  );
});

test('deve permitir login padrão do professor sem cadastro prévio', () => {
  const store = { users: [] };

  const session = loginLocalUser({ username: 'professor', password: '123456', store });

  assert.equal(session.user.username, 'professor');
  assert.equal(session.user.role, 'docente');
  assert.equal(store.users.some((user) => user.username === 'professor'), true);
});

test('deve bloquear criação de usuários por aluno e permitir por professor', () => {
  const store = {
    users: [{ username: 'professor', password: '123456', role: 'docente', name: 'Professor' }],
  };

  assert.throws(
    () =>
      createUserAccount({
        username: 'aluno01',
        password: '123456',
        role: 'aluno',
        actorRole: 'aluno',
        name: 'Aluno 01',
        store,
      }),
    /Apenas professores/i,
  );

  const created = createUserAccount({
    username: 'aluno01',
    password: '123456',
    role: 'aluno',
    actorRole: 'docente',
    name: 'Aluno 01',
    store,
  });

  assert.equal(created.role, 'aluno');
  assert.equal(store.users.some((user) => user.username === 'aluno01'), true);
});

test('deve limpar a sessão sem quebrar quando o storage nativo não estiver disponível', async () => {
  await assert.doesNotReject(() => clearSession());
});
