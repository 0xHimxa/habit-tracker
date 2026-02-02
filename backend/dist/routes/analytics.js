"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const analytics_1 = require("../controllers/analytics");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', analytics_1.getAnalytics);
exports.default = router;
//# sourceMappingURL=analytics.js.map