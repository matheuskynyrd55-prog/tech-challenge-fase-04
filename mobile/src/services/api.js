const API_PORT = 3000;
const REQUEST_TIMEOUT_MS = 10000;
const STORAGE_KEY_SESSION = 'tc_session_v2';

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const memoryStore = {};
let storagePromise = null;
let cachedSession;
let unauthorizedHandler = null;

const getStorage = () => {
  if (!storagePromise) {
    storagePromise = import('@react-native-async-storage/async-storage')
      .then((module) => module.default || module)
      .catch(() => null);
  }
  return storagePromise;
};

const readItem = async (key) => {
  try {
    const storage = await getStorage();
    if (storage) {
      const value = await storage.getItem(key);
      if (value !== null && value !== undefined) return value;
    }
  } catch (error) {
    // Storage nativo indisponível: usa o valor em memória.
  }
  return memoryStore[key] ?? null;
};

const writeItem = async (key, value) => {
  memoryStore[key] = value;
  try {
    const storage = await getStorage();
    if (storage) await storage.setItem(key, value);
  } catch (error) {
    // Mantém apenas em memória.
  }
};

const removeItem = async (key) => {
  delete memoryStore[key];
  try {
    const storage = await getStorage();
    if (storage) await storage.removeItem(key);
  } catch (error) {
    // Nada a limpar além da memória.
  }
};

let baseUrlPromise = null;

const resolveBaseUrl = async () => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  let host = 'localhost';
  try {
    const module = await import('expo-constants');
    const Constants = module.default || module;
    const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) host = String(hostUri).split(':')[0];
  } catch (error) {
    // Sem Expo Constants: usa localhost.
  }

  return `http://${host}:${API_PORT}/api/v1`;
};

export const getBaseUrl = () => {
  if (!baseUrlPromise) baseUrlPromise = resolveBaseUrl();
  return baseUrlPromise;
};

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

export const loadSession = async () => {
  if (cachedSession !== undefined) return cachedSession;

  const raw = await readItem(STORAGE_KEY_SESSION);
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    cachedSession = parsed && parsed.token && parsed.user ? parsed : null;
  } catch (error) {
    cachedSession = null;
  }
  return cachedSession;
};

const saveSession = async (session) => {
  cachedSession = session;
  await writeItem(STORAGE_KEY_SESSION, JSON.stringify(session));
};

export const clearSession = async () => {
  cachedSession = null;
  await removeItem(STORAGE_KEY_SESSION);
};

const NETWORK_ERROR_MESSAGE =
  'Não foi possível conectar ao servidor. Verifique se a API está em execução e se o celular está na mesma rede.';

const extractMessage = (data, fallback) => {
  if (data && Array.isArray(data.details) && data.details.length > 0) {
    return data.details.map((item) => item.message).join(' ');
  }
  return (data && data.message) || fallback;
};

const request = async (path, { method = 'GET', body, skipAuthHandling = false } = {}) => {
  const baseUrl = await getBaseUrl();
  const session = await loadSession();

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller ? controller.signal : undefined,
    });
  } catch (error) {
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && !skipAuthHandling) {
      await clearSession();
      if (unauthorizedHandler) unauthorizedHandler();
      throw new ApiError('Sessão expirada. Faça login novamente.', 401);
    }
    throw new ApiError(extractMessage(data, `Erro ${response.status} ao acessar o servidor.`), response.status);
  }

  return data;
};

const mapComment = (comment = {}) => ({
  id: String(comment.id),
  author: comment.author,
  content: comment.content,
  createdAt: comment.createdAt,
});

const mapPost = (post = {}) => {
  const likes = Array.isArray(post.likes) ? post.likes : [];
  const comments = Array.isArray(post.comments) ? post.comments.map(mapComment) : [];

  return {
    id: String(post.id),
    title: post.title,
    content: post.content,
    author: post.author,
    createdAt: post.createdAt,
    likedBy: likes.map((like) => like.author),
    likes: Number(post.likesCount ?? likes.length),
    comments,
    commentsCount: Number(post._count?.comments ?? comments.length),
  };
};

const mapUser = (user = {}) => ({
  id: user.id,
  username: user.username,
  name: user.name || user.username,
  role: user.role === 'docente' ? 'docente' : 'aluno',
});

export const loginUser = async (username, password) => {
  try {
    const data = await request('/auth/login', {
      method: 'POST',
      body: { username, password },
      skipAuthHandling: true,
    });
    const session = { token: data.token, user: mapUser(data.user) };
    await saveSession(session);
    return session;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 400)) {
      throw new ApiError('Credenciais inválidas.', 401);
    }
    throw error;
  }
};

export const fetchPosts = async () => {
  const data = await request('/posts');
  return (Array.isArray(data) ? data : []).map(mapPost);
};

export const fetchPost = async (id) => mapPost(await request(`/posts/${id}`));

export const createPost = async ({ title, content }) =>
  mapPost(await request('/posts', { method: 'POST', body: { title, content } }));

export const updatePost = async (id, { title, content }) =>
  mapPost(await request(`/posts/${id}`, { method: 'PUT', body: { title, content } }));

export const deletePost = async (id) => {
  await request(`/posts/${id}`, { method: 'DELETE' });
  return { ok: true, id };
};

export const toggleLike = async (postId) => request(`/posts/${postId}/likes`, { method: 'POST' });

export const addComment = async (postId, content) =>
  mapComment(await request(`/posts/${postId}/comments`, { method: 'POST', body: { content } }));

export const getUsers = async () => {
  const data = await request('/users');
  return (Array.isArray(data) ? data : []).map(mapUser);
};

export const registerUser = async ({ name, username, password, role }) => {
  const data = await request('/users', { method: 'POST', body: { name, username, password, role } });
  return { ok: true, user: mapUser(data) };
};

export const editUser = async ({ id, name, password, role }) => {
  const body = { name, role };
  if (password) body.password = password;
  const data = await request(`/users/${id}`, { method: 'PUT', body });
  return { ok: true, user: mapUser(data) };
};

export const removeUser = async (id) => {
  await request(`/users/${id}`, { method: 'DELETE' });
  return { ok: true };
};
