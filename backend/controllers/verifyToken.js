const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  //ACCESS TOKEN FROM HEADER, REFRESH TOKEN FROM COOKIE
  const token = req.headers.token;
  const refreshToken = req.cookies.refreshToken;
  if (token) {
    const accessToken = token.split(" ")[1];
    jwt.verify(accessToken, process.env.JWT_ACCESS_KEY, (err, user) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            message: "Token đã hết hạn",
            code: "TOKEN_EXPIRED"
          });
        }
        return res.status(403).json({
          message: "Token không hợp lệ",
          code: "INVALID_TOKEN"
        });
      }
      req.user = user;
      next();
    });
  } else {
    return res.status(401).json({
      message: "Không tìm thấy token xác thực",
      code: "NO_TOKEN"
    });
  }
};

const verifyTokenAndUserAuthorization = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.id === req.params.id || req.user.isAdmin || req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({
        message: "Bạn không có quyền thực hiện hành động này",
        code: "INSUFFICIENT_PERMISSIONS"
      });
    }
  });
};

const verifyTokenAndAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.isAdmin || req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({
        message: "Bạn cần quyền admin để thực hiện hành động này",
        code: "ADMIN_REQUIRED"
      });
    }
  });
};

module.exports = {
  verifyToken,
  verifyTokenAndUserAuthorization,
  verifyTokenAndAdmin,
};
