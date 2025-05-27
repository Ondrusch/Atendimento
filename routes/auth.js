const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email e senha são obrigatórios",
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Credenciais inválidas",
      });
    }

    const isValidPassword = await User.validatePassword(
      password,
      user.password
    );
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Credenciais inválidas",
      });
    }

    // Atualizar status para online
    await User.updateStatus(user.id, "online");

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      message: "Login realizado com sucesso",
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: "online",
        },
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Logout
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    await User.updateStatus(req.user.id, "offline");

    res.json({
      success: true,
      message: "Logout realizado com sucesso",
    });
  } catch (error) {
    console.error("Erro no logout:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Verificar token
router.get("/verify", authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          status: req.user.status,
        },
      },
    });
  } catch (error) {
    console.error("Erro na verificação:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Atualizar status do usuário
router.put("/status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["online", "offline", "busy"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status inválido",
      });
    }

    const updatedUser = await User.updateStatus(req.user.id, status);

    res.json({
      success: true,
      message: "Status atualizado com sucesso",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

module.exports = router;
