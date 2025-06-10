const jwt = require('jsonwebtoken');

const middlewareController = {
    verifyToken: (req, res, next) => {
        try {
            // Get token from Authorization header
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).json({
                    message: "Không tìm thấy token xác thực",
                    code: "NO_TOKEN"
                });
            }

            // Extract token (remove 'Bearer ' if present)
            const token = authHeader.startsWith('Bearer ') 
                ? authHeader.slice(7) 
                : authHeader;

            console.log(`Token verification for ${req.method} ${req.path}`);

            // Verify token
            jwt.verify(
                token, 
                process.env.JWT_ACCESS_KEY, 
                (error, decoded) => {
                    if (error) {
                        console.log('Token verification failed:', error.name, error.message, 'for route:', req.path);
                        if (error.name === 'TokenExpiredError') {
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
                    console.log('Token verified successfully for user:', decoded.id, 'route:', req.path);
                    req.user = decoded;
                    next();
                }
            );
        } catch (error) {
            console.error('Token verification error:', error);
            res.status(500).json({
                message: "Lỗi xác thực token",
                code: "AUTH_ERROR"
            });
        }
    },

    verifyAdmin: (req, res, next) => {
        middlewareController.verifyToken(req, res, () => {
            if (!req.user) {
                return res.status(401).json({
                    message: "Không tìm thấy thông tin người dùng",
                    code: "NO_USER"
                });
            }

            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    message: "Bạn không có quyền truy cập tài nguyên này",
                    code: "NOT_ADMIN"
                });
            }

            next();
        });
    },

    verifyTokenAndAdminAuth: (req, res, next) => {
        middlewareController.verifyToken(req, res, () => {
            if (!req.user) {
                return res.status(401).json({
                    message: "Không tìm thấy thông tin người dùng",
                    code: "NO_USER"
                });
            }

            if (req.user.id === req.params.id || req.user.role === 'admin') {
                next();
            } else {
                res.status(403).json({
                    message: "Bạn không có quyền thực hiện hành động này",
                    code: "INSUFFICIENT_PERMISSIONS"
                });
            }
        });
    }
};

module.exports = middlewareController;