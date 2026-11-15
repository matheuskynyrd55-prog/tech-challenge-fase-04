import authModule from './auth.js';

const fallbackStorage = {
  getItem: async () => null,
  setItem: async () => true,
  removeItem: async () => true,
};

let resolvedStorage = null;

const getStorageClient = async () => {
  if (resolvedStorage) return resolvedStorage;

  try {
    const storageModule = await import('@react-native-async-storage/async-storage');
    resolvedStorage = storageModule.default || storageModule;
    return resolvedStorage;
  } catch (error) {
    resolvedStorage = fallbackStorage;
    return resolvedStorage;
  }
};

const { createUserAccount, loginLocalUser, ensureDefaultTeacher, updateUserAccount, deleteUserAccount } = authModule;

const STORAGE_KEYS = {
  users: 'tc_users_v1',
  posts: 'tc_posts_v1',
  session: 'tc_session_v1',
};

const memoryStore = globalThis.__tc_storage_store || {};
if (!globalThis.__tc_storage_store) {
  globalThis.__tc_storage_store = memoryStore;
}

const readStorage = async (key, fallback = []) => {
  const storageClient = await getStorageClient();

  try {
    const raw = await storageClient.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (error) {
    const value = memoryStore[key];
    if (value === undefined) return fallback;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
};

const writeStorage = async (key, value) => {
  const storageClient = await getStorageClient();

  try {
    await storageClient.setItem(key, JSON.stringify(value));
  } catch (error) {
    memoryStore[key] = JSON.stringify(value);
  }

  memoryStore[key] = JSON.stringify(value);
  return true;
};

const normalizePost = (post = {}) => ({
  ...post,
  id: String(post.id ?? `${Date.now()}`),
  title: String(post.title ?? '').trim(),
  content: String(post.content ?? '').trim(),
  author: String(post.author ?? 'usuario'),
  likes: Number(post.likes || 0),
  likedBy: Array.isArray(post.likedBy) ? post.likedBy : [],
  comments: Array.isArray(post.comments)
    ? post.comments.map((comment) => ({
        ...comment,
        id: String(comment.id ?? `${Date.now()}-${Math.random()}`),
        author: String(comment.author || 'usuario'),
        content: String(comment.content || '').trim(),
        createdAt: comment.createdAt || new Date().toISOString(),
      }))
    : [],
  createdAt: post.createdAt || new Date().toISOString(),
});

const readPosts = async () => {
  const posts = await readStorage(STORAGE_KEYS.posts, []);
  return Array.isArray(posts) ? posts.map(normalizePost) : [];
};

const writePosts = async (posts) => writeStorage(STORAGE_KEYS.posts, posts.map(normalizePost));

const getStoredUsers = async () => {
  const users = await readStorage(STORAGE_KEYS.users, []);
  const normalizedUsers = Array.isArray(users) ? users : [];
  const ensuredUsers = ensureDefaultTeacher({ users: normalizedUsers });

  if (JSON.stringify(ensuredUsers) !== JSON.stringify(normalizedUsers)) {
    await writeStorage(STORAGE_KEYS.users, ensuredUsers);
  }

  return ensuredUsers;
};

export const getUsers = async () => {
  const users = await getStoredUsers();
  return users.map((user) => ({
    username: String(user.username || '').trim(),
    name: String(user.name || user.username || '').trim(),
    role: user.role === 'docente' ? 'docente' : 'aluno',
  }));
};

export const fetchPosts = async () => {
  const posts = await readPosts();
  return posts;
};

export const loginUser = async (username, password) => {
  const store = { users: await getStoredUsers() };
  const session = loginLocalUser({ username, password, store });
  await writeStorage(STORAGE_KEYS.users, store.users);
  await writeStorage(STORAGE_KEYS.session, session);
  return session;
};

export const registerUser = async ({ username, password, role, name, actorRole }) => {
  const store = { users: await getStoredUsers() };
  const user = createUserAccount({ username, password, role, name, actorRole, store });
  await writeStorage(STORAGE_KEYS.users, store.users);
  return {
    ok: true,
    user: {
      username: user.username,
      role: user.role,
      name: user.name,
    },
  };
};

export const editUser = async ({ username, name, password, role, actorRole }) => {
  const store = { users: await getStoredUsers() };
  const user = updateUserAccount({ username, name, password, role, actorRole, store });
  await writeStorage(STORAGE_KEYS.users, store.users);
  return { ok: true, user: { username: user.username, role: user.role, name: user.name } };
};

export const removeUser = async ({ username, actorRole, actorUsername }) => {
  const store = { users: await getStoredUsers() };
  deleteUserAccount({ username, actorRole, actorUsername, store });
  await writeStorage(STORAGE_KEYS.users, store.users);
  return { ok: true };
};

export const loadSession = async () => {
  const storageClient = await getStorageClient();

  try {
    const raw = await storageClient.getItem(STORAGE_KEYS.session);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.user ? parsed : null;
  } catch (error) {
    const value = memoryStore[STORAGE_KEYS.session];
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      return parsed && parsed.user ? parsed : null;
    } catch {
      return null;
    }
  }
};

export const clearSession = async () => {
  const storageClient = await getStorageClient();

  try {
    await storageClient.removeItem(STORAGE_KEYS.session);
  } catch (error) {
    memoryStore[STORAGE_KEYS.session] = null;
  }
};

export const searchPosts = async (term = '') => {
  const posts = await readPosts();
  const query = String(term || '').trim().toLowerCase();
  if (!query) return posts;
  return posts.filter((post) =>
    [post.title, post.author, post.content].some((field) =>
      String(field).toLowerCase().includes(query),
    ),
  );
};

export const createPost = async (payload) => {
  const posts = await readPosts();
  const next = [
    normalizePost({
      ...payload,
      id: payload.id || `post-${Date.now()}`,
      createdAt: payload.createdAt || new Date().toISOString(),
      likes: Number(payload.likes || 0),
      likedBy: Array.isArray(payload.likedBy) ? payload.likedBy : [],
      comments: Array.isArray(payload.comments) ? payload.comments : [],
    }),
    ...posts,
  ];
  await writePosts(next);
  return next[0];
};

export const updatePost = async (id, payload) => {
  const posts = await readPosts();
  const updated = posts.map((post) => {
    if (String(post.id) !== String(id)) return post;
    return normalizePost({ ...post, ...payload, id });
  });
  await writePosts(updated);
  return updated.find((post) => String(post.id) === String(id)) || normalizePost(payload);
};

export const deletePost = async (id) => {
  const posts = await readPosts();
  const remaining = posts.filter((post) => String(post.id) !== String(id));
  await writePosts(remaining);
  return { ok: true, id };
};

export const toggleLike = async (postId, userName) => {
  const posts = await readPosts();
  const nextPosts = posts.map((post) => {
    if (String(post.id) !== String(postId)) return post;
    const likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
    const alreadyLiked = !!userName && likedBy.includes(userName);
    const nextLikedBy = alreadyLiked
      ? likedBy.filter((member) => member !== userName)
      : [...likedBy, userName].filter(Boolean);

    return normalizePost({
      ...post,
      likedBy: nextLikedBy,
      likes: Math.max(0, Number(post.likes || 0) + (alreadyLiked ? -1 : 1)),
    });
  });

  await writePosts(nextPosts);
  return nextPosts.find((post) => String(post.id) === String(postId)) || null;
};

export const addComment = async (postId, content, author) => {
  const posts = await readPosts();
  const nextPosts = posts.map((post) => {
    if (String(post.id) !== String(postId)) return post;
    const comment = {
      id: `comment-${Date.now()}`,
      author: author || 'usuario',
      content: String(content || '').trim(),
      createdAt: new Date().toISOString(),
    };
    return normalizePost({
      ...post,
      comments: [...(post.comments || []), comment],
    });
  });

  await writePosts(nextPosts);
  const saved = nextPosts.find((post) => String(post.id) === String(postId));
  return saved?.comments?.slice(-1)[0] || null;
};
