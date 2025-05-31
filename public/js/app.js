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
    document.getElementById("adminButtons").classList.remove("d-none");
  }

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

    case "location":
      content = `
                <div class="message-location">
                    <i class="fas fa-map-marker-alt"></i>
                    <div>
                        <div>${message.location_name || "Localização"}</div>
                        <small class="text-muted">${
                          message.location_address || ""
                        }</small>
                    </div>
                </div>
            `;
      break;

    default:
      content = `<div class="message-text">${escapeHtml(
        message.content
      )}</div>`;
  }

  bubble.innerHTML = content;

  const time = document.createElement("div");
  time.className = "message-time";
  time.textContent = formatTime(message.created_at);

  if (message.is_from_me) {
    const status = document.createElement("span");
    status.className = "message-status";
    status.innerHTML = getMessageStatusIcon(message.status);
    time.appendChild(status);
  }

  bubble.appendChild(time);
  div.appendChild(bubble);

  return div;
}

async function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();

  if (!text || !currentConversation) return;

  try {
    const response = await fetch(
      `/api/conversations/${currentConversation.id}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({
          type: "text",
          content: text,
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      input.value = "";
      // A mensagem será adicionada via socket
    } else {
      showNotification("Erro", "Não foi possível enviar a mensagem", "danger");
    }
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    showNotification("Erro", "Erro ao enviar mensagem", "danger");
  }
}

// ===== AÇÕES DA CONVERSA =====

async function assignConversation() {
  if (!currentConversation) return;

  try {
    const response = await fetch(
      `/api/conversations/${currentConversation.id}/assign`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      currentConversation.assigned_user_id = currentUser.id;
      currentConversation.status = "active";
      updateChatButtons();
      showNotification("Sucesso", "Conversa assumida com sucesso", "success");
    }
  } catch (error) {
    console.error("Erro ao assumir conversa:", error);
  }
}

async function transferConversation() {
  // Carregar usuários online
  await loadOnlineUsers();

  // Mostrar modal de transferência
  const modal = new bootstrap.Modal(document.getElementById("transferModal"));
  modal.show();
}

async function confirmTransfer() {
  const userId = document.getElementById("transferUser").value;
  const reason = document.getElementById("transferReason").value;

  if (!userId) {
    showNotification("Erro", "Selecione um usuário para transferir", "warning");
    return;
  }

  try {
    const response = await fetch(
      `/api/conversations/${currentConversation.id}/transfer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({
          to_user_id: userId,
          reason: reason,
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      bootstrap.Modal.getInstance(
        document.getElementById("transferModal")
      ).hide();
      showNotification(
        "Sucesso",
        "Conversa transferida com sucesso",
        "success"
      );
      loadConversations();
    }
  } catch (error) {
    console.error("Erro ao transferir conversa:", error);
  }
}

async function closeConversation() {
  if (!confirm("Tem certeza que deseja finalizar esta conversa?")) return;

  try {
    const response = await fetch(
      `/api/conversations/${currentConversation.id}/close`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      showNotification("Sucesso", "Conversa finalizada com sucesso", "success");
      loadConversations();

      // Voltar para tela inicial
      document.getElementById("noChatSelected").classList.remove("d-none");
      document.getElementById("chatInterface").classList.add("d-none");
      currentConversation = null;
    }
  } catch (error) {
    console.error("Erro ao finalizar conversa:", error);
  }
}

// ===== UTILITÁRIOS =====

function formatTime(timestamp) {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 24 * 60 * 60 * 1000) {
    // Menos de 24 horas
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  }
}

function getStatusText(status) {
  const statusMap = {
    waiting: "Aguardando",
    active: "Ativo",
    closed: "Finalizado",
  };
  return statusMap[status] || status;
}

function getMessageStatusIcon(status) {
  const iconMap = {
    sent: '<i class="fas fa-check"></i>',
    delivered: '<i class="fas fa-check-double"></i>',
    read: '<i class="fas fa-check-double text-primary"></i>',
  };
  return iconMap[status] || "";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function markAsRead() {
  if (!currentConversation) return;

  try {
    await fetch(`/api/conversations/${currentConversation.id}/mark-read`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });
  } catch (error) {
    console.error("Erro ao marcar como lida:", error);
  }
}

// ===== EVENT HANDLERS =====

function handleNewMessage(data) {
  if (currentConversation && data.conversation_id === currentConversation.id) {
    const messageElement = createMessageElement(data.message);
    document.getElementById("messagesContainer").appendChild(messageElement);

    // Scroll para o final
    const container = document.getElementById("messagesContainer");
    container.scrollTop = container.scrollHeight;

    // Marcar como lida se a conversa está ativa
    markAsRead();
  }

  // Atualizar lista de conversas
  loadConversations();

  // Mostrar notificação se não estiver na conversa
  if (!currentConversation || data.conversation_id !== currentConversation.id) {
    showNotification("Nova Mensagem", data.message.content, "info");
  }
}

function handleNewConversation(data) {
  loadConversations();
  showNotification(
    "Nova Conversa",
    `Nova conversa de ${data.contact.name || data.contact.phone}`,
    "info"
  );
}

function handleConversationAssigned(data) {
  loadConversations();
  if (currentConversation && data.conversation_id === currentConversation.id) {
    updateChatButtons();
  }
}

function handleConversationTransferred(data) {
  loadConversations();
  showNotification(
    "Conversa Transferida",
    `Conversa transferida para ${data.to_user_name}`,
    "info"
  );
}

function handleConversationClosed(data) {
  loadConversations();
  if (currentConversation && data.conversation_id === currentConversation.id) {
    showNotification(
      "Conversa Finalizada",
      "Esta conversa foi finalizada",
      "info"
    );

    // Voltar para tela inicial
    document.getElementById("noChatSelected").classList.remove("d-none");
    document.getElementById("chatInterface").classList.add("d-none");
    currentConversation = null;
  }
}

function handleTyping() {
  if (!currentConversation || !socket) return;

  socket.emit("typing", { conversationId: currentConversation.id });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stop_typing", { conversationId: currentConversation.id });
  }, 1000);
}

function showTypingIndicator(data) {
  if (!currentConversation || data.conversationId !== currentConversation.id)
    return;

  let indicator = document.querySelector(".typing-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.className = "typing-indicator";
    indicator.innerHTML = `
            ${data.userName} está digitando
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
    document.getElementById("messagesContainer").appendChild(indicator);
  }
}

function hideTypingIndicator(data) {
  const indicator = document.querySelector(".typing-indicator");
  if (indicator) {
    indicator.remove();
  }
}

// ===== OUTRAS FUNÇÕES =====

async function changeStatus(status) {
  try {
    const response = await fetch("/api/auth/status", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();

    if (data.success) {
      updateUserStatus(status);
      if (socket) {
        socket.emit("update_status", status);
      }
    }
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
  }
}

function updateUserStatus(status) {
  const statusElement = document.getElementById("userStatusBadge");
  const statusIndicator = document.getElementById("statusIndicator");
  const statusIndicatorDropdown = document.getElementById(
    "statusIndicatorDropdown"
  );

  const statusMap = {
    online: { text: "Online", class: "bg-success" },
    busy: { text: "Ocupado", class: "bg-warning" },
    offline: { text: "Offline", class: "bg-secondary" },
  };

  const statusInfo = statusMap[status] || statusMap["offline"];

  // Atualizar badge no dropdown
  if (statusElement) {
    statusElement.textContent = statusInfo.text;
    statusElement.className = `badge ${statusInfo.class}`;
  }

  // Atualizar indicadores visuais
  if (statusIndicator) {
    statusIndicator.className = `status-indicator ${status}`;
  }

  if (statusIndicatorDropdown) {
    statusIndicatorDropdown.className = `status-indicator-large ${status}`;
  }
}

async function loadOnlineUsers() {
  try {
    const response = await fetch("/api/admin/users/online", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      const select = document.getElementById("transferUser");
      select.innerHTML = '<option value="">Selecione um usuário...</option>';

      data.data.forEach((user) => {
        if (user.id !== currentUser.id) {
          const option = document.createElement("option");
          option.value = user.id;
          option.textContent = `${user.name} (${user.role})`;
          select.appendChild(option);
        }
      });
    }
  } catch (error) {
    console.error("Erro ao carregar usuários online:", error);
  }
}

function filterConversations(filter) {
  // Remover classe ativa de todos os botões
  document.querySelectorAll(".btn-group .btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Adicionar classe ativa ao botão clicado
  event.target.classList.add("active");

  // Filtrar conversas
  let filteredConversations = conversations;

  switch (filter) {
    case "waiting":
      filteredConversations = conversations.filter(
        (c) => c.status === "waiting"
      );
      break;
    case "mine":
      filteredConversations = conversations.filter(
        (c) => c.assigned_user_id === currentUser.id
      );
      break;
    default:
      filteredConversations = conversations;
  }

  // Renderizar conversas filtradas
  const container = document.getElementById("conversationsList");
  container.innerHTML = "";

  filteredConversations.forEach((conversation) => {
    const item = createConversationItem(conversation);
    container.appendChild(item);
  });
}

function selectFile() {
  document.getElementById("fileInput").click();
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Implementar upload de arquivo
  console.log("Arquivo selecionado:", file);
  // TODO: Implementar envio de mídia
}

function toggleEmojiPicker() {
  // Implementar seletor de emoji
  console.log("Toggle emoji picker");
  // TODO: Implementar seletor de emoji
}

// ===== FUNÇÕES ADMINISTRATIVAS =====

function showAdminPanel() {
  const modal = new bootstrap.Modal(document.getElementById("adminPanel"));
  modal.show();

  // Carregar dados iniciais
  loadEvolutionConfigs();
  loadInstances();
  loadUsers();
}

// ===== EVOLUTION API CONFIGS =====

async function loadEvolutionConfigs() {
  try {
    const response = await fetch("/api/admin/evolution-configs", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      renderEvolutionConfigs(data.data);
    }
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
  }
}

function renderEvolutionConfigs(configs) {
  const container = document.getElementById("evolutionConfigsList");

  if (configs.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-4">
        <i class="fas fa-api fa-3x mb-3"></i>
        <p>Nenhuma configuração cadastrada</p>
      </div>
    `;
    return;
  }

  container.innerHTML = configs
    .map(
      (config) => `
    <div class="card mb-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6 class="card-title">${config.name}</h6>
            <p class="card-text">
              <small class="text-muted">URL: ${config.server_url}</small><br>
              <small class="text-muted">Instâncias: ${
                config.total_instances || 0
              } (${config.active_instances || 0} ativas)</small>
            </p>
            <span class="badge ${
              config.is_active ? "bg-success" : "bg-secondary"
            }">
              ${config.is_active ? "Ativa" : "Inativa"}
            </span>
          </div>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="editEvolutionConfig('${
              config.id
            }')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-info" onclick="testEvolutionConfig('${
              config.id
            }')">
              <i class="fas fa-plug"></i>
            </button>
            <button class="btn btn-outline-danger" onclick="deleteEvolutionConfig('${
              config.id
            }')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

function showAddEvolutionConfig() {
  document.getElementById("evolutionConfigModalTitle").textContent =
    "Nova Configuração Evolution API";
  document.getElementById("evolutionConfigForm").reset();
  document.getElementById("evolutionConfigId").value = "";

  const modal = new bootstrap.Modal(
    document.getElementById("evolutionConfigModal")
  );
  modal.show();
}

function editEvolutionConfig(id) {
  // Implementar edição
  console.log("Editar config:", id);
}

async function saveEvolutionConfig() {
  const id = document.getElementById("evolutionConfigId").value;
  const name = document.getElementById("evolutionConfigName").value;
  const server_url = document.getElementById("evolutionConfigUrl").value;
  const api_key = document.getElementById("evolutionConfigKey").value;
  const webhook_url = document.getElementById("evolutionConfigWebhook").value;

  try {
    const url = id
      ? `/api/admin/evolution-configs/${id}`
      : "/api/admin/evolution-configs";
    const method = id ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: JSON.stringify({
        name,
        server_url,
        api_key,
        webhook_url,
      }),
    });

    const data = await response.json();

    if (data.success) {
      bootstrap.Modal.getInstance(
        document.getElementById("evolutionConfigModal")
      ).hide();
      loadEvolutionConfigs();
      showNotification("Sucesso", "Configuração salva com sucesso", "success");
    } else {
      showNotification("Erro", data.message, "danger");
    }
  } catch (error) {
    console.error("Erro ao salvar configuração:", error);
    showNotification("Erro", "Erro ao salvar configuração", "danger");
  }
}

async function testEvolutionConfig(id) {
  try {
    const response = await fetch(`/api/admin/evolution-configs/${id}/test`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });

    const data = await response.json();

    if (data.success && data.data.success) {
      showNotification(
        "Sucesso",
        "Conexão estabelecida com sucesso",
        "success"
      );
    } else {
      showNotification(
        "Erro",
        data.data.message || "Falha na conexão",
        "danger"
      );
    }
  } catch (error) {
    console.error("Erro ao testar conexão:", error);
    showNotification("Erro", "Erro ao testar conexão", "danger");
  }
}

async function deleteEvolutionConfig(id) {
  if (!confirm("Tem certeza que deseja excluir esta configuração?")) return;

  try {
    const response = await fetch(`/api/admin/evolution-configs/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      loadEvolutionConfigs();
      showNotification(
        "Sucesso",
        "Configuração excluída com sucesso",
        "success"
      );
    } else {
      showNotification("Erro", data.message, "danger");
    }
  } catch (error) {
    console.error("Erro ao excluir configuração:", error);
    showNotification("Erro", "Erro ao excluir configuração", "danger");
  }
}

// ===== INSTÂNCIAS =====

async function loadInstances() {
  try {
    const response = await fetch("/api/admin/instances", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      renderInstances(data.data);
    }
  } catch (error) {
    console.error("Erro ao carregar instâncias:", error);
  }
}

function renderInstances(instances) {
  const container = document.getElementById("instancesList");

  if (instances.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-4">
        <i class="fas fa-mobile-alt fa-3x mb-3"></i>
        <p>Nenhuma instância cadastrada</p>
      </div>
    `;
    return;
  }

  container.innerHTML = instances
    .map(
      (instance) => `
    <div class="card mb-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6 class="card-title">${instance.name}</h6>
            <p class="card-text">
              <small class="text-muted">ID: ${instance.instance_id}</small><br>
              <small class="text-muted">Config: ${
                instance.config_name
              }</small><br>
              <small class="text-muted">Conversas: ${
                instance.total_conversations || 0
              } (${instance.active_conversations || 0} ativas)</small>
            </p>
            <span class="badge ${
              instance.is_active ? "bg-success" : "bg-secondary"
            }">
              ${instance.is_active ? "Ativa" : "Inativa"}
            </span>
          </div>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="editInstance('${
              instance.id
            }')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-warning" onclick="toggleInstance('${
              instance.id
            }')">
              <i class="fas fa-power-off"></i>
            </button>
            <button class="btn btn-outline-danger" onclick="deleteInstance('${
              instance.id
            }')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

async function showAddInstance() {
  // Carregar configurações para o select
  await loadEvolutionConfigsForSelect();

  document.getElementById("instanceModalTitle").textContent = "Nova Instância";
  document.getElementById("instanceForm").reset();
  document.getElementById("instanceId").value = "";

  const modal = new bootstrap.Modal(document.getElementById("instanceModal"));
  modal.show();
}

async function loadEvolutionConfigsForSelect() {
  try {
    const response = await fetch("/api/admin/evolution-configs", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      const select = document.getElementById("instanceConfigId");
      select.innerHTML =
        '<option value="">Selecione uma configuração...</option>';

      data.data.forEach((config) => {
        if (config.is_active) {
          const option = document.createElement("option");
          option.value = config.id;
          option.textContent = config.name;
          select.appendChild(option);
        }
      });
    }
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
  }
}

async function saveInstance() {
  const id = document.getElementById("instanceId").value;
  const name = document.getElementById("instanceName").value;
  const instance_id = document.getElementById("instanceInstanceId").value;
  const evolution_config_id = document.getElementById("instanceConfigId").value;

  try {
    const url = id ? `/api/admin/instances/${id}` : "/api/admin/instances";
    const method = id ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: JSON.stringify({
        name,
        instance_id,
        evolution_config_id,
      }),
    });

    const data = await response.json();

    if (data.success) {
      bootstrap.Modal.getInstance(
        document.getElementById("instanceModal")
      ).hide();
      loadInstances();
      showNotification("Sucesso", "Instância salva com sucesso", "success");
    } else {
      showNotification("Erro", data.message, "danger");
    }
  } catch (error) {
    console.error("Erro ao salvar instância:", error);
    showNotification("Erro", "Erro ao salvar instância", "danger");
  }
}

function editInstance(id) {
  console.log("Editar instância:", id);
}

async function toggleInstance(id) {
  try {
    const response = await fetch(`/api/admin/instances/${id}/toggle`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      loadInstances();
      showNotification("Sucesso", data.message, "success");
    } else {
      showNotification("Erro", data.message, "danger");
    }
  } catch (error) {
    console.error("Erro ao alterar status da instância:", error);
    showNotification("Erro", "Erro ao alterar status da instância", "danger");
  }
}

async function deleteInstance(id) {
  if (!confirm("Tem certeza que deseja excluir esta instância?")) return;

  try {
    const response = await fetch(`/api/admin/instances/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      loadInstances();
      showNotification("Sucesso", "Instância excluída com sucesso", "success");
    } else {
      showNotification("Erro", data.message, "danger");
    }
  } catch (error) {
    console.error("Erro ao excluir instância:", error);
    showNotification("Erro", "Erro ao excluir instância", "danger");
  }
}

// ===== USUÁRIOS =====

async function loadUsers() {
  try {
    const response = await fetch("/api/admin/users", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      renderUsers(data.data);
    }
  } catch (error) {
    console.error("Erro ao carregar usuários:", error);
  }
}

function renderUsers(users) {
  const container = document.getElementById("usersList");

  container.innerHTML = users
    .map(
      (user) => `
    <div class="card mb-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6 class="card-title">${user.name}</h6>
            <p class="card-text">
              <small class="text-muted">Email: ${user.email}</small><br>
              <small class="text-muted">Função: ${getRoleText(
                user.role
              )}</small>
            </p>
            <span class="badge ${getStatusBadgeClass(user.status)}">
              ${getStatusText(user.status)}
            </span>
          </div>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="editUser('${
              user.id
            }')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-danger" onclick="deleteUser('${
              user.id
            }')" 
                    ${user.id === currentUser.id ? "disabled" : ""}>
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

function getRoleText(role) {
  const roles = {
    admin: "Administrador",
    supervisor: "Supervisor",
    atendente: "Atendente",
  };
  return roles[role] || role;
}

function getStatusBadgeClass(status) {
  const classes = {
    online: "bg-success",
    busy: "bg-warning",
    offline: "bg-secondary",
  };
  return classes[status] || "bg-secondary";
}

function showAddUser() {
  document.getElementById("userModalTitle").textContent = "Novo Usuário";
  document.getElementById("userForm").reset();
  document.getElementById("userId").value = "";
  document.getElementById("passwordField").style.display = "block";
  document.getElementById("userPassword").required = true;

  const modal = new bootstrap.Modal(document.getElementById("userModal"));
  modal.show();
}

function editUser(id) {
  console.log("Editar usuário:", id);
}

async function saveUser() {
  const id = document.getElementById("userId").value;
  const name = document.getElementById("userName").value;
  const email = document.getElementById("userEmail").value;
  const password = document.getElementById("userPassword").value;
  const role = document.getElementById("userRole").value;

  const userData = { name, email, role };
  if (password) userData.password = password;

  try {
    const url = id ? `/api/admin/users/${id}` : "/api/admin/users";
    const method = id ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (data.success) {
      bootstrap.Modal.getInstance(document.getElementById("userModal")).hide();
      loadUsers();
      showNotification("Sucesso", "Usuário salvo com sucesso", "success");
    } else {
      showNotification("Erro", data.message, "danger");
    }
  } catch (error) {
    console.error("Erro ao salvar usuário:", error);
    showNotification("Erro", "Erro ao salvar usuário", "danger");
  }
}

async function deleteUser(id) {
  if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

  try {
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      loadUsers();
      showNotification("Sucesso", "Usuário excluído com sucesso", "success");
    } else {
      showNotification("Erro", data.message, "danger");
    }
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    showNotification("Erro", "Erro ao excluir usuário", "danger");
  }
}

// Função para atualizar mensagens sem recarregar a página
async function refreshMessages() {
  if (!currentConversation) return;

  const refreshBtn = document.getElementById("refreshBtn");
  const originalIcon = refreshBtn.innerHTML;

  try {
    // Mostrar loading no botão
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    // Recarregar mensagens
    await loadMessages();

    // Mostrar notificação suave
    showNotification(
      "Atualizado",
      "Mensagens atualizadas com sucesso",
      "success"
    );
  } catch (error) {
    console.error("Erro ao atualizar mensagens:", error);
    showNotification("Erro", "Erro ao atualizar mensagens", "danger");
  } finally {
    // Restaurar botão
    setTimeout(() => {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = originalIcon;
    }, 500);
  }
}

// Função para atualizar todas as conversas
async function refreshConversations() {
  const refreshBtn = document.getElementById("refreshConversationsBtn");
  const originalIcon = refreshBtn ? refreshBtn.innerHTML : null;

  try {
    // Mostrar loading no botão se existir
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    await loadConversations();
    showNotification("Atualizado", "Lista de conversas atualizada", "success");
  } catch (error) {
    console.error("Erro ao atualizar conversas:", error);
    showNotification("Erro", "Erro ao atualizar conversas", "danger");
  } finally {
    // Restaurar botão
    if (refreshBtn && originalIcon) {
      setTimeout(() => {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = originalIcon;
      }, 500);
    }
  }
}

// ===== FUNÇÕES PLACEHOLDER PARA NOVAS OPÇÕES DO MENU =====

function showProfileSettings() {
  showNotification(
    "Em Desenvolvimento",
    "Configurações de perfil em desenvolvimento",
    "info"
  );
}

function showNotificationSettings() {
  showNotification(
    "Em Desenvolvimento",
    "Configurações de notificações em desenvolvimento",
    "info"
  );
}

function showUserManagement() {
  // Abrir o painel admin na aba de usuários
  showAdminPanel();
  // Ativar a aba de usuários
  setTimeout(() => {
    const usersTab = document.getElementById("users-tab");
    if (usersTab) {
      usersTab.click();
    }
  }, 100);
}
