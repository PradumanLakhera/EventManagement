const jwt = require("jsonwebtoken");

const authenticateAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authentication required."
      });
    }

    const parts = authHeader.trim().split(/\s+/);

    if (
      parts.length !== 2 ||
      parts[0].toLowerCase() !== "bearer"
    ) {
      return res.status(401).json({
        message: "Invalid authentication format."
      });
    }

    const token = parts[1];

    if (!token) {
      return res.status(401).json({
        message: "Authentication token missing."
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded || decoded.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required."
      });
    }

    req.admin = decoded;

    next();
  } catch (error) {
    console.error(
      "Authentication error:",
      error.message
    );

    return res.status(401).json({
      message: "Invalid or expired token."
    });
  }
};

module.exports = authenticateAdmin;