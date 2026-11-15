const DEFAULT_TEACHER = {
  username: 'professor',
  password: '123456',
  role: 'docente',
  name: 'Professor',
};

const normalizeRole = (role) => (role === 'docente' ? 'docente' : 'aluno');

const normalizeUsername = (value) => String(value || '').trim().toLowerCase();

const getUsers = (store = {}) => (Array.isArray(store.users) ? store.users : []);

const setUsers = (store = {}, users = []) => {
  store.users = users;
  return store.users;
};

const ensureDefaultTeacher = (store = { users: [] }) => {
  const users = getUsers(store);
  const exists = users.some((user) => normalizeUsername(user.username) === normalizeUsername(DEFAULT_TEACHER.username));

  if (!exists) {
    setUsers(store, [
      ...users,
      {
        ...DEFAULT_TEACHER,
        username: DEFAULT_TEACHER.username,
        password: DEFAULT_TEACHER.password,
        role: normalizeRole(DEFAULT_TEACHER.role),
        name: DEFAULT_TEACHER.name,
      },
    ]);
  }

  return getUsers(store);
};

const createUserAccount = ({ username, password, role, name, actorRole, store = { users: [] } }) => {
  const cleanedUsername = String(username || '').trim();
  const cleanedPassword = String(password || '').trim();

  if (!cleanedUsername || !cleanedPassword) {
    throw new Error('Informe usuário e senha.');
  }

  if (cleanedUsername.length < 3) {
    throw new Error('O usuário deve ter pelo menos 3 caracteres.');
  }

  if (actorRole && normalizeRole(actorRole) !== 'docente') {
    throw new Error('Apenas professores podem cadastrar usuários.');
  }

  const users = getUsers(store);
  const alreadyExists = users.some(
    (user) => normalizeUsername(user.username) === normalizeUsername(cleanedUsername),
  );

  if (alreadyExists) {
    throw new Error('Usuário já cadastrado.');
  }

  const user = {
    username: cleanedUsername,
    password: cleanedPassword,
    role: normalizeRole(role),
    name: String(name || cleanedUsername),
  };

  setUsers(store, [...users, user]);
  return { ...user };
};

const loginLocalUser = ({ username, password, store = { users: [] } }) => {
  const cleanedUsername = normalizeUsername(username);
  const cleanedPassword = String(password || '');

  const users = ensureDefaultTeacher(store);
  const user = users.find(
    (account) => normalizeUsername(account.username) === cleanedUsername && account.password === cleanedPassword,
  );

  if (!user) {
    throw new Error('Credenciais inválidas');
  }

  return {
    token: `local-${Date.now()}`,
    user: {
      username: user.username,
      role: normalizeRole(user.role),
      name: user.name || user.username,
    },
  };
};

const updateUserAccount = ({ username, name, password, role, actorRole, store = { users: [] } }) => {
  if (normalizeRole(actorRole) !== 'docente') {
    throw new Error('Apenas professores podem editar usuários.');
  }

  const users = getUsers(store);
  const index = users.findIndex((user) => normalizeUsername(user.username) === normalizeUsername(username));

  if (index === -1) {
    throw new Error('Usuário não encontrado.');
  }

  const current = users[index];
  const nextRole = normalizeRole(role ?? current.role);
  const isDefaultTeacher = normalizeUsername(current.username) === normalizeUsername(DEFAULT_TEACHER.username);

  if (isDefaultTeacher && nextRole !== 'docente') {
    throw new Error('O professor padrão deve permanecer como professor.');
  }

  const cleanedPassword = String(password || '').trim();
  const updated = {
    ...current,
    name: String(name || '').trim() || current.name || current.username,
    role: nextRole,
    password: cleanedPassword || current.password,
  };

  setUsers(store, users.map((user, position) => (position === index ? updated : user)));
  return { ...updated };
};

const deleteUserAccount = ({ username, actorRole, actorUsername, store = { users: [] } }) => {
  if (normalizeRole(actorRole) !== 'docente') {
    throw new Error('Apenas professores podem excluir usuários.');
  }

  const target = normalizeUsername(username);

  if (target === normalizeUsername(DEFAULT_TEACHER.username)) {
    throw new Error('O professor padrão não pode ser excluído.');
  }

  if (target === normalizeUsername(actorUsername)) {
    throw new Error('Você não pode excluir o próprio usuário.');
  }

  const users = getUsers(store);
  const remaining = users.filter((user) => normalizeUsername(user.username) !== target);

  if (remaining.length === users.length) {
    throw new Error('Usuário não encontrado.');
  }

  setUsers(store, remaining);
  return { ok: true };
};

module.exports = {
  DEFAULT_TEACHER,
  createUserAccount,
  deleteUserAccount,
  ensureDefaultTeacher,
  loginLocalUser,
  normalizeRole,
  normalizeUsername,
  updateUserAccount,
};
