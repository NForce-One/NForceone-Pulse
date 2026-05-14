import jwt from "jsonwebtoken";

/**
 * 🔐 AUTH MIDDLEWARE (FIXED)
 */
export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secretkey"
    );

    // 🔥 FIX: normalize user object
    req.user = decoded.user || decoded;

    // 🔥 SAFETY CHECK
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

/**
 * 🔐 ROLE-BASED ACCESS CONTROL (NO CHANGE)
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      console.log(' authorizeRoles check - user:', req.user);
      console.log(' authorizeRoles check - allowedRoles:', allowedRoles);
      console.log(' authorizeRoles check - user.role:', req.user.role);
      console.log(' authorizeRoles check - includes:', allowedRoles.includes(req.user.role));

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied: ${req.user.role} cannot access this resource`,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Authorization error",
      });
    }
  };
};