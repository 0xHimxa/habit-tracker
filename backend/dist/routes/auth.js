"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../controllers/auth");
const auth_2 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const authValidators_1 = require("../utils/authValidators");
const router = (0, express_1.Router)();
router.post('/signup', (0, validation_1.validateRequest)({ body: authValidators_1.signupSchema }), auth_1.signup);
router.post('/login', (0, validation_1.validateRequest)({ body: authValidators_1.loginSchema }), auth_1.login);
router.post('/refresh', (0, validation_1.validateRequest)({ body: authValidators_1.refreshTokenSchema }), auth_1.refreshToken);
router.get('/profile', auth_2.authenticate, auth_1.getProfile);
exports.default = router;
//# sourceMappingURL=auth.js.map