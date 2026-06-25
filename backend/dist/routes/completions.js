"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const completions_1 = require("../controllers/completions");
const autoAuth_1 = require("../middleware/autoAuth");
const validation_1 = require("../middleware/validation");
const completionValidators_1 = require("../utils/completionValidators");
const router = (0, express_1.Router)();
router.use(autoAuth_1.autoAuth);
router.post('/', (0, validation_1.validateRequest)({ body: completionValidators_1.createCompletionSchema }), completions_1.createCompletion);
router.get('/calendar', completions_1.getCalendarData);
router.get('/range', (0, validation_1.validateRequest)({ query: completionValidators_1.getCompletionsByDateRangeSchema }), completions_1.getCompletionsByDateRange);
const habitIdParamSchema = zod_1.z.object({ habitId: zod_1.z.string().min(1) });
router.get('/:habitId', (0, validation_1.validateRequest)({ params: habitIdParamSchema, query: completionValidators_1.getCompletionsSchema }), completions_1.getCompletions);
router.delete('/:completionId', (0, validation_1.validateRequest)({ params: completionValidators_1.deleteCompletionSchema }), completions_1.deleteCompletion);
exports.default = router;
//# sourceMappingURL=completions.js.map