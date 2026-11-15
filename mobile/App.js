import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  addComment,
  clearSession,
  createPost,
  deletePost,
  editUser,
  fetchPosts,
  loadSession,
  loginUser,
  registerUser,
  removeUser,
  toggleLike,
  updatePost,
} from './src/services/api';

const defaultForm = { title: '', content: '' };

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizePosts = (list = []) =>
  (Array.isArray(list) ? list : []).map((post) => ({
    ...post,
    id: String(post.id ?? `${Date.now()}-${Math.random()}`),
    likes: Number(post.likes || 0),
    likedBy: Array.isArray(post.likedBy) ? post.likedBy : [],
    comments: Array.isArray(post.comments)
      ? post.comments.map((comment) => ({
          ...comment,
          id: String(comment.id ?? `${Date.now()}-${Math.random()}`),
          createdAt: comment.createdAt || new Date().toISOString(),
        }))
      : [],
    createdAt: post.createdAt || new Date().toISOString(),
  }));

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Informe usuário e senha para continuar.');
      return;
    }

    setLoading(true);
    try {
      const result = await onLogin(username.trim(), password);
      if (result?.error) {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.loginContainer}
      >
        <Text style={styles.title}>Portal Acadêmico</Text>
        <Text style={styles.subtitle}>Login</Text>

        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Usuário"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Senha"
          secureTextEntry
        />

        <Pressable onPress={handleLogin} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function UserFormScreen({ role, onRoleChange, onSubmit, onBack, editingUser }) {
  const isEditing = !!editingUser;
  const [name, setName] = useState(editingUser?.name || '');
  const [username, setUsername] = useState(editingUser?.username || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !username.trim() || (!isEditing && !password.trim())) {
      setError(isEditing ? 'Preencha o nome.' : 'Preencha nome, usuário e senha.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      const result = await onSubmit({ username: username.trim(), password, role, name: name.trim() });
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.ok) {
        setName('');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        onBack();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.editorContainer}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </Pressable>

        <Text style={styles.title}>{isEditing ? 'Editar usuário' : 'Cadastro'}</Text>
        <Text style={styles.subtitle}>{isEditing ? 'Deixe a senha em branco para mantê-la' : 'Selecione o tipo de usuário'}</Text>

        <View style={styles.roleRow}>
          <Pressable
            onPress={() => onRoleChange('docente')}
            style={[styles.roleOption, role === 'docente' && styles.roleOptionActive]}
          >
            <Text style={[styles.roleText, role === 'docente' && styles.roleTextActive]}>Professor</Text>
          </Pressable>
          <Pressable
            onPress={() => onRoleChange('aluno')}
            style={[styles.roleOption, role === 'aluno' && styles.roleOptionActive]}
          >
            <Text style={[styles.roleText, role === 'aluno' && styles.roleTextActive]}>Aluno</Text>
          </Pressable>
        </View>

        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nome completo" />
        <TextInput
          style={[styles.input, isEditing && styles.inputDisabled]}
          value={username}
          onChangeText={setUsername}
          placeholder="Usuário"
          autoCapitalize="none"
          editable={!isEditing}
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={isEditing ? 'Nova senha (opcional)' : 'Senha'}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirmar senha"
          secureTextEntry
        />

        <Pressable onPress={handleSubmit} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{loading ? 'Salvando...' : isEditing ? 'Salvar' : 'Cadastrar'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function BottomNav({ current, onHome, onAdmin, onUserManager }) {
  return (
    <View style={styles.bottomNavWrap}>
      <Pressable onPress={onHome} style={[styles.menuItem, current === 'home' && styles.menuItemActive]}>
        <Text style={[styles.menuItemText, current === 'home' && styles.menuItemTextActive]}>Início</Text>
      </Pressable>
      <Pressable onPress={onAdmin} style={[styles.menuItem, current === 'admin' && styles.menuItemActive]}>
        <Text style={[styles.menuItemText, current === 'admin' && styles.menuItemTextActive]}>Administração</Text>
      </Pressable>
      <Pressable onPress={onUserManager} style={[styles.menuItem, current === 'user-manager' && styles.menuItemActive]}>
        <Text style={[styles.menuItemText, current === 'user-manager' && styles.menuItemTextActive]}>Cadastros</Text>
      </Pressable>
    </View>
  );
}

function UserManagerScreen({ users, onOpenForm, onEditUser, onDeleteUser, onBack, onHome, onAdmin, onUserManager }) {
  const [error, setError] = useState('');

  const handleDelete = async (username) => {
    const result = await onDeleteUser(username);
    setError(result?.error || '');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.detailContainer}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </Pressable>

        <Text style={styles.title}>Cadastros</Text>
        <Text style={styles.subtitle}>Lista de usuários cadastrados</Text>

        <Pressable onPress={() => onOpenForm('docente')} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>+ Cadastrar</Text>
        </Pressable>

        {!!error && (
          <View style={[styles.errorBanner, styles.adminNewButton]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <ScrollView style={styles.listScroll} contentContainerStyle={styles.userListWrap} showsVerticalScrollIndicator={false}>
          {users.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>Nenhum usuário cadastrado</Text>
            </View>
          ) : (
            users.map((item) => (
              <View key={`${item.role}-${item.username}`} style={styles.userCard}>
                <View style={styles.userMeta}>
                  <Text style={styles.userName}>{item.name || item.username}</Text>
                  <Text style={styles.userRole}>{item.role === 'docente' ? 'Professor' : 'Aluno'}</Text>
                </View>
                <Text style={styles.userUsername}>@{item.username}</Text>
                <View style={styles.adminActions}>
                  <Pressable onPress={() => onEditUser(item)} style={styles.secondaryButtonSmall}>
                    <Text style={styles.secondaryButtonText}>Editar</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDelete(item.username)} style={styles.deleteButton}>
                    <Text style={styles.deleteButtonText}>Excluir</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <BottomNav
          current="user-manager"
          onHome={onHome}
          onAdmin={onAdmin}
          onUserManager={onUserManager}
        />
      </View>
    </SafeAreaView>
  );
}

function HomeScreen({
  user,
  posts,
  onOpenPost,
  onLogout,
  onLike,
  onOpenCreate,
  onOpenAdmin,
  onOpenUserManager,
  onOpenLogin,
  onSearch,
  searchTerm,
}) {
  const isDocente = user?.role === 'docente';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appShell}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Portal</Text>
            <Text style={styles.headerUser}>{user?.name || user?.username || 'Visitante'}</Text>
          </View>

          <View style={styles.headerActions}>
            {isDocente && (
              <Pressable onPress={onOpenCreate} style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Novo post</Text>
              </Pressable>
            )}

            {user ? (
              <Pressable
                onPress={() => {
                  if (typeof onLogout === 'function') {
                    onLogout();
                  }
                }}
                style={styles.logoutButton}
              >
                <Text style={styles.logoutButtonText}>Sair</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  if (typeof onOpenLogin === 'function') {
                    onOpenLogin();
                  }
                }}
                style={styles.logoutButton}
              >
                <Text style={styles.logoutButtonText}>Entrar</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.searchBox}>
          <TextInput
            value={searchTerm}
            onChangeText={onSearch}
            placeholder="Buscar postagem..."
            style={styles.searchInput}
          />
        </View>

        {!user && (
          <View style={styles.bannerCallout}>
            <Text style={styles.bannerText}>Visualização pública. Faça login como professor para gerenciar e como aluno para curtir e comentar.</Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>{posts.length} posts</Text>
          <Text style={styles.summaryText}>{user ? (isDocente ? 'Docente' : 'Aluno') : 'Visitante'}</Text>
        </View>

        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const liked = !!user && (item.likedBy || []).includes(user?.username);

            return (
              <Pressable onPress={() => onOpenPost(item)} style={styles.postCard}>
                <View style={styles.postHeaderRow}>
                  <Text style={styles.postTitle}>{item.title}</Text>
                  {user && (
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        onLike(item.id);
                      }}
                      style={[styles.likeChip, liked && styles.likeChipActive]}
                    >
                      <Text style={[styles.likeChipText, liked && styles.likeChipTextActive]}>
                        {liked ? 'Curtido' : 'Curtir'} {item.likes || 0}
                      </Text>
                    </Pressable>
                  )}
                </View>

                <Text style={styles.postAuthor}>Autor: {item.author}</Text>
                <Text style={styles.postContent} numberOfLines={3}>{item.content}</Text>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{(item.comments || []).length} comentários</Text>
                  <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
                </View>
              </Pressable>
            );
          }}
        />

        {isDocente && (
          <BottomNav
            current="home"
            onHome={() => setScreen('home')}
            onAdmin={onOpenAdmin}
            onUserManager={onOpenUserManager}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function DetailScreen({ post, onBack, onLike, onAddComment, onEdit, onDelete, user }) {
  const [draft, setDraft] = useState('');
  const isDocente = user?.role === 'docente';
  const liked = !!user && (post.likedBy || []).includes(user?.username);

  const handleSubmit = () => {
    if (!user || !draft.trim()) return;
    onAddComment(post.id, draft.trim());
    setDraft('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.detailContainer}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </Pressable>

        {isDocente && (
          <View style={styles.actionRowInline}>
            <Pressable onPress={() => onEdit(post)} style={styles.secondaryButtonSmall}>
              <Text style={styles.secondaryButtonText}>Editar</Text>
            </Pressable>
            <Pressable onPress={() => onDelete(post.id)} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>Excluir</Text>
            </Pressable>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.detailTitle}>{post.title}</Text>
          <Text style={styles.detailAuthor}>Autor: {post.author}</Text>
          <Text style={styles.detailBody}>{post.content}</Text>

          <View style={styles.actionRow}>
            {user ? (
              <Pressable
                onPress={() => onLike(post.id)}
                style={[styles.primaryButtonSmall, liked && styles.likeButtonActive]}
              >
                <Text style={styles.primaryButtonText}>{liked ? 'Descurtir' : 'Curtir'} • {post.likes || 0}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => {}} style={[styles.primaryButtonSmall, styles.likeChipDisabled]}>
                <Text style={styles.primaryButtonText}>Login para curtir</Text>
              </Pressable>
            )}
            <Text style={styles.metaText}>{(post.comments || []).length} respostas</Text>
          </View>

          <View style={styles.commentSection}>
            <Text style={styles.sectionTitle}>Comentários</Text>

            {(post.comments || []).map((comment) => (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentHeaderRow}>
                  <Text style={styles.commentAuthor}>{comment.author}</Text>
                  <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
                </View>
                <Text style={styles.commentText}>{comment.content}</Text>
              </View>
            ))}

            {user ? (
              <>
                <TextInput
                  style={styles.commentInput}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Escreva um comentário..."
                  multiline
                />

                <Pressable onPress={handleSubmit} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Enviar comentário</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.infoText}>Faça login como aluno ou professor para comentar.</Text>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function EditorScreen({ mode, initialValues, onSave, onCancel, user }) {
  const [form, setForm] = useState(initialValues || defaultForm);

  useEffect(() => {
    setForm(initialValues || defaultForm);
  }, [initialValues]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.editorContainer}>
        <Text style={styles.title}>{mode === 'create' ? 'Novo post' : 'Editar post'}</Text>

        <TextInput
          style={styles.input}
          value={form.title}
          onChangeText={(value) => updateField('title', value)}
          placeholder="Título"
        />

        <TextInput style={styles.input} value={user?.username || 'usuario'} placeholder="Autor" editable={false} />

        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.content}
          onChangeText={(value) => updateField('content', value)}
          placeholder="Conteúdo"
          multiline
        />

        <Pressable onPress={() => onSave(form)} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{mode === 'create' ? 'Publicar' : 'Salvar'}</Text>
        </Pressable>

        <Pressable onPress={onCancel} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Cancelar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function AdminScreen({ posts, onDelete, onEdit, onCreate, onBack, user, onHome, onAdmin, onUserManager }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.detailContainer}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Administração</Text>

        {user?.role === 'docente' && (
          <Pressable onPress={onCreate} style={[styles.primaryButton, styles.adminNewButton]}>
            <Text style={styles.primaryButtonText}>+ Novo post</Text>
          </Pressable>
        )}

        <ScrollView style={styles.listScroll} contentContainerStyle={styles.scrollBottomPad} showsVerticalScrollIndicator={false}>
        {posts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Nenhuma postagem para administrar</Text>
            <Text style={styles.emptyStateText}>Crie a primeira publicação como professor para visualizar o painel aqui.</Text>
          </View>
        ) : (
          posts.map((post) => (
            <View key={String(post.id)} style={styles.adminCard}>
              <View>
                <Text style={[styles.postTitle, styles.adminPostTitle]}>{post.title}</Text>
                <Text style={styles.postAuthor}>Autor: {post.author}</Text>
              </View>
              {user?.role === 'docente' && (
                <View style={styles.adminActions}>
                  <Pressable onPress={() => onEdit(post)} style={styles.secondaryButtonSmall}>
                    <Text style={styles.secondaryButtonText}>Editar</Text>
                  </Pressable>
                  <Pressable onPress={() => onDelete(post.id)} style={styles.deleteButton}>
                    <Text style={styles.deleteButtonText}>Excluir</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
        </ScrollView>

        <BottomNav
          current="admin"
          onHome={onHome}
          onAdmin={onAdmin}
          onUserManager={onUserManager}
        />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [posts, setPosts] = useState(() => normalizePosts([]));
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [editorMode, setEditorMode] = useState('create');
  const [editorValues, setEditorValues] = useState(defaultForm);
  const [editorReturn, setEditorReturn] = useState('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [screen, setScreen] = useState('home');
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [selectedUserRole, setSelectedUserRole] = useState('docente');
  const [allUsers, setAllUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);

  const visiblePosts = useMemo(() => {
    if (!searchTerm.trim()) return posts;
    const lower = searchTerm.trim().toLowerCase();
    return posts.filter((post) =>
      [post.title, post.author, post.content].some((field) =>
        String(field).toLowerCase().includes(lower),
      ),
    );
  }, [posts, searchTerm]);

  const selectedPost = posts.find((post) => String(post.id) === String(selectedPostId)) || null;

  const refreshUsers = async () => {
    try {
      const data = await (await import('./src/services/api')).getUsers();
      setAllUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      setAllUsers([]);
    }
  };

  const ensureUserListLoaded = async () => {
    await refreshUsers();
  };

  useEffect(() => {
    const restoreSession = async () => {
      const session = await loadSession();
      if (session?.user) {
        setUser(session.user);
        setToken(session.token);
      } else {
        setUser(null);
        setToken(null);
      }
      setIsRestoringSession(false);
      await refreshUsers();
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (user) {
      setScreen('home');
      setUserMenuOpen(false);
      loadPosts();
      ensureUserListLoaded();
    } else {
      setSelectedPostId(null);
      setUserMenuOpen(false);
      loadPosts();
      ensureUserListLoaded();
    }
  }, [user]);

  useEffect(() => {
    if (screen === 'user-manager') {
      ensureUserListLoaded();
    }
  }, [screen]);

  useEffect(() => {
    const backAction = () => {
      if (screen === 'editor') {
        if (editorReturn === 'admin') setSelectedPostId(null);
        setScreen(editorReturn);
        setEditorValues(defaultForm);
        return true;
      }
      if (screen === 'create-user') {
        setEditingUser(null);
        setScreen('user-manager');
        return true;
      }
      if (screen === 'admin' || screen === 'user-manager') {
        setScreen('home');
        return true;
      }
      if (selectedPostId) {
        setSelectedPostId(null);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => subscription.remove();
  }, [screen, selectedPostId, user, editorReturn]);

  const loadPosts = async () => {
    setLoadingPosts(true);
    const data = await fetchPosts();
    setPosts(normalizePosts(data || []));
    setLoadingPosts(false);
  };

  const handleLogin = async (username, password) => {
    try {
      const response = await loginUser(username, password);
      setUser(response.user);
      setToken(response.token);
      setScreen('home');
      setSearchTerm('');
      return { ok: true };
    } catch (error) {
      return { error: error.message || 'Credenciais inválidas.' };
    }
  };

  const handleLogout = async () => {
    try {
      await clearSession();
    } catch (error) {
      // Ignored: session cleanup should not block logout in environments without AsyncStorage.
    }
    setUser(null);
    setToken(null);
    setSelectedPostId(null);
    setScreen('home');
    setSearchTerm('');
  };

  const handleLike = async (postId) => {
    if (!user) return;

    const currentPost = posts.find((post) => String(post.id) === String(postId));
    const username = user?.username;
    const likedBy = Array.isArray(currentPost?.likedBy) ? currentPost.likedBy : [];
    const alreadyLiked = Boolean(username && likedBy.includes(username));

    const nextLikedBy = alreadyLiked
      ? likedBy.filter((member) => member !== username)
      : [...likedBy, username].filter(Boolean);

    const nextLikes = Math.max(0, Number(currentPost?.likes || 0) + (alreadyLiked ? -1 : 1));

    setPosts((current) =>
      current.map((post) => {
        if (String(post.id) !== String(postId)) return post;
        return {
          ...post,
          likes: nextLikes,
          likedBy: nextLikedBy,
        };
      }),
    );

    await toggleLike(postId, username);
  };

  const handleAddComment = async (postId, commentText) => {
    if (!user || !commentText.trim()) return;

    const response = await addComment(postId, commentText.trim(), user?.name || user?.username || 'Você');
    const comment = response || {
      id: `${Date.now()}`,
      author: user?.name || user?.username || 'Você',
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    };

    setPosts((current) =>
      current.map((post) => {
        if (String(post.id) !== String(postId)) return post;
        return {
          ...post,
          comments: [...(post.comments || []), comment],
        };
      }),
    );
  };

  const handleCreate = async (payload) => {
    if (!user || user.role !== 'docente') return;

    const payloadToSave = {
      ...payload,
      id: `post-${Date.now()}`,
      author: user?.username || payload.author || 'usuario',
      likes: 0,
      likedBy: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };

    const created = await createPost(payloadToSave);
    setPosts((current) => [normalizePosts([created || payloadToSave])[0], ...current]);
    setScreen(editorReturn);
    setEditorValues(defaultForm);
  };

  const handleUpdate = async (payload) => {
    if (!user || user.role !== 'docente') return;

    const source = posts.find((item) => String(item.id) === String(selectedPostId));
    const updated = await updatePost(selectedPostId, {
      ...source,
      ...payload,
      author: user?.username || source?.author || 'usuario',
    });
    setPosts((current) =>
      current.map((post) =>
        String(post.id) === String(selectedPostId) ? { ...post, ...updated } : post,
      ),
    );
    setScreen(editorReturn);
    setEditorValues(defaultForm);
    setSelectedPostId(null);
  };

  const handleDelete = async (postId) => {
    if (!user || user.role !== 'docente') return;
    await deletePost(postId);
    setPosts((current) => current.filter((post) => String(post.id) !== String(postId)));
    if (String(selectedPostId) === String(postId)) {
      setSelectedPostId(null);
    }
  };

  const handleCreateUser = async ({ username, password, role, name }) => {
    if (!user || user.role !== 'docente') {
      return { error: 'Apenas professores logados podem cadastrar usuários.' };
    }

    try {
      const response = await registerUser({ username, password, role, name, actorRole: user.role });
      const createdUser = response?.user || { username, name, role };

      setAllUsers((current) => {
        const safeCurrent = Array.isArray(current) ? current : [];
        const alreadyPresent = safeCurrent.some(
          (entry) => String(entry.username || '').toLowerCase() === String(createdUser.username || '').toLowerCase(),
        );

        if (alreadyPresent) {
          return safeCurrent.map((entry) =>
            String(entry.username || '').toLowerCase() === String(createdUser.username || '').toLowerCase()
              ? { ...entry, ...createdUser, role: createdUser.role || entry.role }
              : entry,
          );
        }

        return [
          ...safeCurrent,
          {
            username: createdUser.username,
            name: createdUser.name || createdUser.username,
            role: createdUser.role || role,
          },
        ];
      });

      await refreshUsers();
      setUserMenuOpen(false);
      setScreen('user-manager');
      return { ok: true, user: createdUser };
    } catch (error) {
      return { error: error.message || 'Não foi possível criar o usuário.' };
    }
  };

  const handleUpdateUser = async ({ username, password, role, name }) => {
    if (!user || user.role !== 'docente') {
      return { error: 'Apenas professores logados podem editar usuários.' };
    }

    try {
      const response = await editUser({ username, password, role, name, actorRole: user.role });
      await refreshUsers();

      if (String(response.user.username).toLowerCase() === String(user.username).toLowerCase()) {
        if (response.user.name !== user.name || response.user.role !== user.role) {
          setUser((current) => ({ ...current, name: response.user.name, role: response.user.role }));
        }
      }

      setEditingUser(null);
      setScreen('user-manager');
      return { ok: true, user: response.user };
    } catch (error) {
      return { error: error.message || 'Não foi possível editar o usuário.' };
    }
  };

  const handleDeleteUser = async (username) => {
    try {
      await removeUser({ username, actorRole: user?.role, actorUsername: user?.username });
      await refreshUsers();
      return { ok: true };
    } catch (error) {
      return { error: error.message || 'Não foi possível excluir o usuário.' };
    }
  };

  if (isRestoringSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f4f73" />
        <Text style={styles.loadingText}>Carregando sessão...</Text>
      </View>
    );
  }

  if (screen === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (screen === 'user-manager') {
    return (
      <UserManagerScreen
        users={allUsers}
        onOpenForm={(role) => {
          setEditingUser(null);
          setSelectedUserRole(role);
          setScreen('create-user');
        }}
        onEditUser={(item) => {
          setEditingUser(item);
          setSelectedUserRole(item.role);
          setScreen('create-user');
        }}
        onDeleteUser={handleDeleteUser}
        onBack={() => setScreen('home')}
        onHome={() => setScreen('home')}
        onAdmin={() => setScreen('admin')}
        onUserManager={() => setScreen('user-manager')}
      />
    );
  }

  if (screen === 'create-user') {
    return (
      <UserFormScreen
        role={selectedUserRole}
        onRoleChange={setSelectedUserRole}
        onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
        editingUser={editingUser}
        onBack={() => {
          setEditingUser(null);
          setScreen('user-manager');
        }}
      />
    );
  }

  if (screen === 'editor') {
    return (
      <EditorScreen
        mode={editorMode}
        initialValues={editorValues}
        onSave={editorMode === 'create' ? handleCreate : handleUpdate}
        onCancel={() => {
          if (editorReturn === 'admin') setSelectedPostId(null);
          setScreen(editorReturn);
          setEditorValues(defaultForm);
        }}
        user={user}
      />
    );
  }

  if (screen === 'admin') {
    return (
      <AdminScreen
        posts={posts}
        onDelete={handleDelete}
        onEdit={(post) => {
          setEditorReturn('admin');
          setEditorValues({
            title: post.title || '',
            content: post.content || '',
          });
          setEditorMode('edit');
          setSelectedPostId(post.id);
          setScreen('editor');
        }}
        onCreate={() => {
          setEditorReturn('admin');
          setEditorValues(defaultForm);
          setEditorMode('create');
          setSelectedPostId(null);
          setScreen('editor');
        }}
        onBack={() => setScreen('home')}
        user={user}
        onHome={() => setScreen('home')}
        onAdmin={() => setScreen('admin')}
        onUserManager={() => setScreen('user-manager')}
      />
    );
  }

  if (selectedPost) {
    return (
      <DetailScreen
        post={selectedPost}
        onBack={() => setSelectedPostId(null)}
        onLike={handleLike}
        onAddComment={handleAddComment}
        onEdit={(post) => {
          setEditorReturn('home');
          setEditorValues({
            title: post.title || '',
            content: post.content || '',
          });
          setEditorMode('edit');
          setSelectedPostId(post.id);
          setScreen('editor');
        }}
        onDelete={handleDelete}
        user={user}
      />
    );
  }

  if (loadingPosts) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f4f73" />
        <Text style={styles.loadingText}>Carregando posts...</Text>
      </View>
    );
  }

  return (
    <HomeScreen
      user={user}
      posts={visiblePosts}
      onOpenPost={(post) => setSelectedPostId(post.id)}
      onLogout={async () => {
        await handleLogout();
        setUserMenuOpen(false);
      }}
      onLike={handleLike}
      onOpenCreate={() => {
        if (!user || user.role !== 'docente') {
          setScreen('login');
          return;
        }
        setEditorValues(defaultForm);
        setEditorMode('create');
        setEditorReturn('home');
        setScreen('editor');
      }}
      onOpenAdmin={() => {
        if (!user || user.role !== 'docente') {
          setScreen('login');
          return;
        }
        setUserMenuOpen(false);
        setScreen('admin');
      }}
      onOpenUserManager={() => {
        if (!user || user.role !== 'docente') {
          setScreen('login');
          return;
        }
        setUserMenuOpen(false);
        setScreen('user-manager');
      }}
      onOpenLogin={() => setScreen('login')}
      onSearch={setSearchTerm}
      searchTerm={searchTerm}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#edf1f5',
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Platform.OS === 'android' ? 18 : 0,
  },
  appShell: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'android' ? 96 : 24,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  editorContainer: {
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#15314f',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#4d6478',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d4dce7',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#10243b',
    marginBottom: 14,
  },
  textArea: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#1f4f73',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#1f4f73',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  primaryButtonSmall: {
    backgroundColor: '#1f4f73',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#eaf1f7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonSmall: {
    backgroundColor: '#eaf1f7',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#15314f',
    fontWeight: '700',
    fontSize: 15,
  },
  errorBanner: {
    backgroundColor: '#fdecea',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f5c2c0',
  },
  errorText: {
    color: '#b42318',
    fontWeight: '600',
  },
  bannerCallout: {
    backgroundColor: '#edf3ff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 18,
    marginBottom: 12,
  },
  bannerText: {
    color: '#1f4f73',
    fontWeight: '600',
    fontSize: 13,
  },
  infoText: {
    color: '#4d6478',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#15314f',
    lineHeight: 38,
  },
  headerUser: {
    fontSize: 18,
    color: '#4d6478',
    marginTop: 2,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dfeaf4',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 4,
  },
  profileButtonText: {
    color: '#15314f',
    fontWeight: '700',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#1f4f73',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    minHeight: 42,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  logoutButton: {
    backgroundColor: '#dfeaf4',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: '#15314f',
    fontWeight: '700',
  },
  searchBox: {
    marginBottom: 12,
  },
  searchInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe4ee',
    backgroundColor: '#f7f9fb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2d3d',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryText: {
    color: '#4d6478',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 110,
  },
  bottomNavWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.OS === 'android' ? 28 : 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f4f73',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1a4566',
    padding: 6,
    shadowColor: '#1f4f73',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    zIndex: 10,
  },
  menuItem: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemActive: {
    backgroundColor: '#eaf3fb',
  },
  menuItemText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  menuItemTextActive: {
    color: '#15314f',
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#edf2f8',
  },
  postHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#15314f',
    flex: 1,
  },
  likeChip: {
    minWidth: 92,
    backgroundColor: '#ecf3f9',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  likeChipActive: {
    backgroundColor: '#dff3ea',
  },
  likeChipDisabled: {
    opacity: 0.6,
  },
  likeChipText: {
    color: '#15314f',
    fontSize: 12,
    fontWeight: '700',
  },
  likeChipTextActive: {
    color: '#0d7d45',
  },
  postAuthor: {
    fontSize: 12,
    color: '#5a6f82',
    marginTop: 8,
  },
  postContent: {
    color: '#1b2d3a',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#5a6f82',
  },
  detailContainer: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backButtonText: {
    color: '#1f4f73',
    fontWeight: '700',
    fontSize: 15,
  },
  actionRowInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 18,
  },
  detailTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#15314f',
    marginBottom: 8,
  },
  detailAuthor: {
    color: '#5a6f82',
    fontSize: 13,
    marginBottom: 16,
  },
  detailBody: {
    color: '#1a2d3e',
    fontSize: 16,
    lineHeight: 24,
  },
  commentSection: {
    marginTop: 22,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#15314f',
    marginBottom: 12,
  },
  commentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#edf2f8',
    padding: 12,
    marginBottom: 10,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentAuthor: {
    fontWeight: '700',
    color: '#15314f',
    fontSize: 12,
  },
  commentDate: {
    color: '#5a6f82',
    fontSize: 11,
  },
  commentText: {
    color: '#1a2d3e',
    fontSize: 14,
    lineHeight: 20,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#d4dce7',
    borderRadius: 12,
    minHeight: 90,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    marginTop: 12,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  roleRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 10,
  },
  roleOption: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d4dce7',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleOptionActive: {
    backgroundColor: '#dfeaf4',
    borderColor: '#1f4f73',
  },
  roleText: {
    color: '#15314f',
    fontWeight: '600',
  },
  roleTextActive: {
    color: '#1f4f73',
    fontWeight: '700',
  },
  userListWrap: {
    marginTop: 4,
    gap: 10,
    paddingBottom: 110,
  },
  listScroll: {
    flex: 1,
  },
  scrollBottomPad: {
    paddingBottom: 110,
  },
  adminPostTitle: {
    flex: 0,
    flexGrow: 0,
  },
  inputDisabled: {
    backgroundColor: '#eef2f6',
    color: '#6b7f92',
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eaf0f5',
    padding: 12,
  },
  userMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15314f',
  },
  userRole: {
    color: '#1f4f73',
    fontWeight: '700',
    fontSize: 12,
  },
  userUsername: {
    color: '#5a6f82',
    fontSize: 12,
    marginTop: 6,
  },
  adminCard: {
    flexDirection: 'column',
    alignItems: 'stretch',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#edf2f8',
  },
  adminNewButton: {
    marginBottom: 16,
  },
  adminActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  deleteButton: {
    backgroundColor: '#fbe9e9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#b42318',
    fontWeight: '700',
    fontSize: 14,
  },
  likeButtonActive: {
    backgroundColor: '#dff3ea',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e7edf5',
    padding: 20,
    marginTop: 12,
  },
  emptyStateTitle: {
    color: '#15314f',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyStateText: {
    color: '#4d6478',
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f7fb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#15314f',
    fontWeight: '600',
  },
});
