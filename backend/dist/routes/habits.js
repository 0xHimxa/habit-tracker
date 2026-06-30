"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const habits_1 = require("../controllers/habits");
const autoAuth_1 = require("../middleware/autoAuth");
const validation_1 = require("../middleware/validation");
const habitValidators_1 = require("../utils/habitValidators");
const router = (0, express_1.Router)();
router.use(autoAuth_1.autoAuth);
router.post('/', (0, validation_1.validateRequest)({ body: habitValidators_1.createHabitSchema }), habits_1.createHabit);
router.get('/', (0, validation_1.validateRequest)({ query: habitValidators_1.getHabitsSchema }), habits_1.getHabits);
router.get('/goals', habits_1.getGoals);
router.get('/:habitId/tree', (0, validation_1.validateRequest)({ params: habitValidators_1.getHabitByIdSchema }), habits_1.getGoalTree);
router.post('/:habitId/breakdown', (0, validation_1.validateRequest)({ params: habitValidators_1.getHabitByIdSchema, body: habitValidators_1.autoBreakdownSchema }), habits_1.autoBreakdown);
router.get('/:habitId', (0, validation_1.validateRequest)({ params: habitValidators_1.getHabitByIdSchema }), habits_1.getHabitById);
router.put('/:habitId', (0, validation_1.validateRequest)({ params: habitValidators_1.getHabitByIdSchema, body: habitValidators_1.updateHabitSchema }), habits_1.updateHabit);
router.delete('/:habitId', (0, validation_1.validateRequest)({ params: habitValidators_1.deleteHabitSchema }), habits_1.deleteHabit);
exports.default = router;
//# sourceMappingURL=habits.js.map