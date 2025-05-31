// Variáveis globais
let socket;
let currentUser = null;
let currentConversation = null;
let conversations = [];
let onlineUsers = [];
let typingTimeout;

// Inicialização da aplicação
document.addEventListener("DOMContentLoaded", function () {
  initializeApp();

  // Debug: Verificar se Bootstrap está carregado
  if (typeof bootstrap !== "undefined") {
    console.log("Bootstrap carregado com sucesso");
  } else {
    console.error("Bootstrap não foi carregado!");
  }

  // Adicionar event listener para debug do dropdown
  document.addEventListener("click", function (e) {
    if (e.target.closest("#userDropdown")) {
      console.log("Dropdown clicado");
    }
  });
});

function initializeApp() {
  // Mostrar tela de carregamento
  showLoadingScreen();

  // Verificar se há token salvo
  const token = localStorage.getItem("authToken");
  if (token) {
    verifyToken(token);
  } else {
    // Aguardar um pouco para evitar piscar muito rápido
    setTimeout(() => {
      hideLoadingScreen();
      showLoginScreen();
    }, 800);
  }

  // Event listeners
  setupEventListeners();
}

function setupEventListeners() {
  // Login form
  document.getElementById("loginForm").addEventListener("submit", handleLogin);

  // Message input
  document
    .getElementById("messageInput")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        sendMessage();
      } else {
        handleTyping();
      }
    });

  // File input
  document
    .getElementById("fileInput")
    .addEventListener("change", handleFileSelect);

  // Atalhos de teclado
  document.addEventListener("keydown", function (e) {
    // Ctrl/Cmd + R para refresh (substituir F5)
    if ((e.ctrlKey || e.metaKey) && e.key === "r") {
      e.preventDefault();
      if (currentConversation) {
        refreshMessages();
      } else {
        refreshConversations();
      }
    }

    // F5 para refresh suave (sem recarregar página)
    if (e.key === "F5") {
      e.preventDefault();
      if (currentConversation) {
        refreshMessages();
      } else {
        refreshConversations();
      }
    }

    // Ctrl/Cmd + Shift + R para refresh conversas
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "R") {
      e.preventDefault();
      refreshConversations();
    }
  });
}

// ===== AUTENTICAÇÃO =====

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const submitButton = e.target.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.innerHTML;

  // Mostrar loading no botão
  submitButton.disabled = true;
  submitButton.innerHTML =
    '<i class="fas fa-spinner fa-spin me-2"></i>Entrando...';

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem("authToken", data.data.token);
      currentUser = data.data.user;

      // Mostrar tela de carregamento suave
      showLoadingScreen();

      // Aguardar um pouco para suavidade
      setTimeout(() => {
        hideLoadingScreen();
        showMainInterface();
        initializeSocket();
        loadConversations();
      }, 800);
    } else {
      showError(data.message);
      // Restaurar botão
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;
    }
  } catch (error) {
    console.error("Erro no login:", error);
    showError("Erro ao fazer login. Tente novamente.");

    // Restaurar botão
    submitButton.disabled = false;
    submitButton.innerHTML = originalButtonText;
  }
}

async function verifyToken(token) {
  const startTime = Date.now();
  const minLoadingTime = 800; // Tempo mínimo de carregamento para suavidade

  try {
    const response = await fetch("/api/auth/verify", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    // Calcular tempo restante para garantir carregamento suave
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, minLoadingTime - elapsed);

    if (data.success) {
      currentUser = data.data.user;

      // Aguardar tempo mínimo se necessário
      setTimeout(() => {
        hideLoadingScreen();
        showMainInterface();
        initializeSocket();
        loadConversations();
      }, remainingTime);
    } else {
      localStorage.removeItem("authToken");

      setTimeout(() => {
        hideLoadingScreen();
        showLoginScreen();
      }, remainingTime);
    }
  } catch (error) {
    console.error("Erro na verificação do token:", error);
    localStorage.removeItem("authToken");

    // Aguardar tempo mínimo mesmo em caso de erro
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, minLoadingTime - elapsed);

    setTimeout(() => {
      hideLoadingScreen();
      showLoginScreen();
    }, remainingTime);
  }
}

function logout() {
  if (confirm("Tem certeza que deseja sair?")) {
    // Mostrar loading suave
    showLoadingScreen();

    // Fazer logout no servidor
    fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    }).catch((err) => console.log("Erro no logout do servidor:", err));

    // Limpar dados locais
    localStorage.removeItem("authToken");
    if (socket) {
      socket.disconnect();
    }
    currentUser = null;
    currentConversation = null;
    conversations = [];

    // Ocultar menus administrativos
    document.getElementById("adminMenuItems").classList.add("d-none");

    // Aguardar um pouco para suavidade
    setTimeout(() => {
      hideLoadingScreen();
      showLoginScreen();
    }, 800);
  }
}

// ===== INTERFACE =====

function showLoadingScreen() {
  const loadingScreen = document.getElementById("loadingScreen");
  const loginScreen = document.getElementById("loginScreen");
  const mainInterface = document.getElementById("mainInterface");

  loadingScreen.classList.remove("d-none", "fade-out");
  loadingScreen.classList.add("fade-in");
  loginScreen.classList.add("d-none");
  mainInterface.classList.add("d-none");
}

function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loadingScreen");

  loadingScreen.classList.add("fade-out");

  // Aguardar animação terminar antes de ocultar
  setTimeout(() => {
    loadingScreen.classList.add("d-none");
  }, 300);
}

function showLoginScreen() {
  document.getElementById("loginScreen").classList.remove("d-none");
  document.getElementById("mainInterface").classList.add("d-none");
}

function showMainInterface() {
  document.getElementById("loginScreen").classList.add("d-none");
  document.getElementById("mainInterface").classList.remove("d-none");

  // Atualizar informações do usuário
  document.getElementById("userName").textContent = currentUser.name;
  document.getElementById("userNameDropdown").textContent = currentUser.name;
  document.getElementById("userEmailDropdown").textContent = currentUser.email;
  document.getElementById("userRole").textContent = getRoleText(
    currentUser.role
  );
  updateUserStatus(currentUser.status || "online");

  // Mostrar menu administrativo se for admin
  if (currentUser.role === "admin") {
    document.getElementById("adminMenuItems").classList.remove("d-none");
  }

  // Inicializar dropdown manualmente se necessário
  setTimeout(() => {
    const dropdownElement = document.getElementById('userDropdown');
    if (dropdownElement && typeof bootstrap !== 'undefined') {
      try {
        const dropdown = new bootstrap.Dropdown(dropdownElement);
        console.log("Dropdown inicializado com sucesso");
        
        // Adicionar event listeners para posicionamento
        dropdownElement.addEventListener('show.bs.dropdown', function () {
          console.log('Dropdown sendo mostrado');
          const dropdownMenu = this.nextElementSibling;
          if (dropdownMenu) {
            // Posicionamento relativo ao botão
            dropdownMenu.style.position = 'absolute';
            dropdownMenu.style.zIndex = '9999';
            dropdownMenu.style.top = '100%';
            dropdownMenu.style.right = '0';
            dropdownMenu.style.left = 'auto';
            dropdownMenu.style.transform = 'none';
            dropdownMenu.style.marginTop = '8px';
          }
        });
        
        dropdownElement.addEventListener('shown.bs.dropdown', function () {
          console.log('Dropdown mostrado');
        });
        
      } catch (error) {
        console.error("Erro ao inicializar dropdown:", error);
      }
    }
  }, 100);

  // Mostrar dica sobre atalhos (apenas uma vez por sessão)
  if (!sessionStorage.getItem("shortcutsShown")) {
    setTimeout(() => {
      showNotification(
        "Dica",
        "Use F5 ou Ctrl+R para atualizar mensagens, Ctrl+Shift+R para atualizar conversas",
        "info"
      );
      sessionStorage.setItem("shortcutsShown", "true");
    }, 2000);
  }
}

function showError(message) {
  const errorDiv = document.getElementById("loginError");
  errorDiv.textContent = message;
  errorDiv.classList.remove("d-none");

  setTimeout(() => {
    errorDiv.classList.add("d-none");
  }, 5000);
}

function showNotification(title, message, type = "info") {
  // Criar notificação toast
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-white bg-${type} border-0`;
  toast.setAttribute("role", "alert");
  toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <strong>${title}</strong><br>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

  // Adicionar ao container de notificações
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container position-fixed top-0 end-0 p-3";
    document.body.appendChild(container);
  }

  container.appendChild(toast);

  // Mostrar toast
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();

  // Remover após 5 segundos
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// ===== SOCKET.IO =====

function initializeSocket() {
  socket = io();

  // Autenticar socket
  socket.emit("authenticate", localStorage.getItem("authToken"));

  // Event listeners do socket
  socket.on("authenticated", (data) => {
    console.log("Socket autenticado:", data);
    updateConnectionStatus("connected");
  });

  socket.on("authentication_error", (data) => {
    console.error("Erro na autenticação do socket:", data);
    logout();
  });

  socket.on("new_message", (data) => {
    handleNewMessage(data);
  });

  socket.on("new_conversation", (data) => {
    handleNewConversation(data);
  });

  socket.on("conversation_assigned", (data) => {
    handleConversationAssigned(data);
  });

  socket.on("conversation_transferred", (data) => {
    handleConversationTransferred(data);
  });

  socket.on("conversation_closed", (data) => {
    handleConversationClosed(data);
  });

  socket.on("user_typing", (data) => {
    showTypingIndicator(data);
  });

  socket.on("user_stop_typing", (data) => {
    hideTypingIndicator(data);
  });

  socket.on("connect", () => {
    updateConnectionStatus("connected");
  });

  socket.on("disconnect", () => {
    updateConnectionStatus("disconnected");
  });

  socket.on("reconnecting", () => {
    updateConnectionStatus("connecting");
  });
}

function updateConnectionStatus(status) {
  let statusElement = document.querySelector(".connection-status");
  if (!statusElement) {
    statusElement = document.createElement("div");
    statusElement.className = "connection-status";
    document.body.appendChild(statusElement);
  }

  statusElement.className = `connection-status ${status}`;

  switch (status) {
    case "connected":
      statusElement.innerHTML = '<i class="fas fa-wifi me-2"></i>Conectado';
      break;
    case "disconnected":
      statusElement.innerHTML = '<i class="fas fa-wifi me-2"></i>Desconectado';
      break;
    case "connecting":
      statusElement.innerHTML =
        '<i class="fas fa-spinner fa-spin me-2"></i>Conectando...';
      break;
  }
}

// ===== CONVERSAS =====

async function loadConversations() {
  try {
    const response = await fetch("/api/conversations", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      conversations = data.data;
      renderConversations();
    }
  } catch (error) {
    console.error("Erro ao carregar conversas:", error);
  }
}

function renderConversations() {
  const container = document.getElementById("conversationsList");
  container.innerHTML = "";

  conversations.forEach((conversation) => {
    const item = createConversationItem(conversation);
    container.appendChild(item);
  });
}

function createConversationItem(conversation) {
  const item = document.createElement("div");
  item.className = "conversation-item d-flex align-items-center";
  item.dataset.conversationId = conversation.id;

  if (conversation.status === "waiting") {
    item.classList.add("unread");
  }

  const avatar = conversation.contact_avatar || "/images/default-avatar.png";
  const name = conversation.contact_name || conversation.contact_phone;
  const lastMessage = conversation.last_message || "Sem mensagens";
  const time = formatTime(conversation.last_message_at);

  item.innerHTML = `
        <img src="${avatar}" class="conversation-avatar me-3" alt="Avatar">
        <div class="conversation-info">
            <div class="conversation-name">${name}</div>
            <div class="conversation-last-message">${lastMessage}</div>
            <div class="conversation-status status-${
              conversation.status
            }">${getStatusText(conversation.status)}</div>
        </div>
        <div class="conversation-time">${time}</div>
    `;

  item.addEventListener("click", () => selectConversation(conversation));

  return item;
}

function selectConversation(conversation) {
  // Remover seleção anterior
  document.querySelectorAll(".conversation-item").forEach((item) => {
    item.classList.remove("active");
  });

  // Selecionar nova conversa
  const item = document.querySelector(
    `[data-conversation-id="${conversation.id}"]`
  );
  if (item) {
    item.classList.add("active");
  }

  currentConversation = conversation;

  // Entrar na sala da conversa
  if (socket) {
    socket.emit("join_conversation", conversation.id);
  }

  // Mostrar interface do chat
  showChatInterface();
  loadMessages();
}

function showChatInterface() {
  document.getElementById("noChatSelected").classList.add("d-none");
  document.getElementById("chatInterface").classList.remove("d-none");

  // Atualizar informações do contato
  const avatar =
    currentConversation.contact_avatar || "/images/default-avatar.png";
  const name =
    currentConversation.contact_name || currentConversation.contact_phone;

  document.getElementById("contactAvatar").src = avatar;
  document.getElementById("contactName").textContent = name;
  document.getElementById("contactPhone").textContent =
    currentConversation.contact_phone;

  // Atualizar botões baseado no status da conversa
  updateChatButtons();
}

function updateChatButtons() {
  const assignBtn = document.getElementById("assignBtn");
  const transferBtn = document.getElementById("transferBtn");
  const closeBtn = document.getElementById("closeBtn");

  const isAssigned = currentConversation.assigned_user_id === currentUser.id;
  const isWaiting = currentConversation.status === "waiting";
  const isActive = currentConversation.status === "active";

  assignBtn.style.display = isWaiting ? "inline-block" : "none";
  transferBtn.style.display = isAssigned && isActive ? "inline-block" : "none";
  closeBtn.style.display = isAssigned && isActive ? "inline-block" : "none";
}

// ===== MENSAGENS =====

async function loadMessages() {
  try {
    const response = await fetch(
      `/api/conversations/${currentConversation.id}/messages`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      renderMessages(data.data);
      markAsRead();
    }
  } catch (error) {
    console.error("Erro ao carregar mensagens:", error);
  }
}

function renderMessages(messages) {
  const container = document.getElementById("messagesContainer");
  container.innerHTML = "";

  messages.forEach((message) => {
    const messageElement = createMessageElement(message);
    container.appendChild(messageElement);
  });

  // Scroll para o final
  container.scrollTop = container.scrollHeight;
}

function createMessageElement(message) {
  const div = document.createElement("div");
  div.className = `message ${message.is_from_me ? "sent" : "received"}`;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  // Conteúdo da mensagem baseado no tipo
  let content = "";

  switch (message.message_type) {
    case "text":
      content = `<div class="message-text">${escapeHtml(
        message.content
      )}</div>`;
      break;

    case "image":
      if (message.media_base64) {
        content = `
                    <div class="message-media">
                        <img src="data:${message.media_mimetype};base64,${
          message.media_base64
        }" alt="Imagem">
                    </div>
                    ${
                      message.content
                        ? `<div class="message-text">${escapeHtml(
                            message.content
                          )}</div>`
                        : ""
                    }
                `;
      }
      break;

    case "video":
      if (message.media_base64) {
        content = `
                    <div class="message-media">
                        <video controls>
                            <source src="data:${
                              message.media_mimetype
                            };base64,${message.media_base64}" type="${
          message.media_mimetype
        }">
                        </video>
                    </div>
                    ${
                      message.content
                        ? `<div class="message-text">${escapeHtml(
                            message.content
                          )}</div>`
                        : ""
                    }
                `;
      }
      break;

    case "audio":
      if (message.media_base64) {
        content = `
                    <div class="message-media">
                        <audio controls>
                            <source src="data:${message.media_mimetype};base64,${message.media_base64}" type="${message.media_mimetype}">
                        </audio>
                    </div>
                `;
      }
      break;

    case "document":
      content = `
                <div class="message-document">
                    <i class="fas fa-file"></i>
                    <div>
                        <div>${message.media_filename || "Documento"}</div>
                        <small class="text-muted">${message.content}</small>
                    </div>
                </div>
            `;
      break;
