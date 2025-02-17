const jwt = require("jsonwebtoken");

/**
 * Middleware to authenticate user
 */
const authenticateUser = (req, res, next) => {
    console.log("Received Headers:", req.headers); // 🔍 Debug Log
  let token = req.header("Authorization");

  // Support for token in cookies
  if (!token && req.cookies.token) {
    token = `Bearer ${req.cookies.token}`;
  }

  if (!token) {
    console.warn("No token provided"); // Debugging message
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    if (token.startsWith("Bearer ")) {
      token = token.slice(7, token.length).trim();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("JWT Authentication Error:", error.message);
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = authenticateUser;
