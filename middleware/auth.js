const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token de acesso requerido",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token inválido",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Erro na autenticação:", error);
    res.status(401).json({
      success: false,
      message: "Token inválido",
    });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Acesso negado. Apenas administradores.",
    });
  }
  next();
};

const supervisorMiddleware = (req, res, next) => {
  if (!["admin", "supervisor"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Acesso negado. Apenas administradores e supervisores.",
    });
  }
  next();
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  supervisorMiddleware,
};
