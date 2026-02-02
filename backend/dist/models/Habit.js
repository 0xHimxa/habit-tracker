"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Habit = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const habitSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    goalType: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        required: true
    },
    targetCount: {
        type: Number,
        required: true,
        min: 1,
        max: 1000
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    active: {
        type: Boolean,
        required: true,
        default: true,
        index: true
    }
}, {
    timestamps: true
});
habitSchema.index({ userId: 1, active: 1, createdAt: -1 });
habitSchema.index({ userId: 1, goalType: 1, active: 1 });
habitSchema.index({ userId: 1, createdAt: -1 });
habitSchema.index({ goalType: 1, active: 1 });
habitSchema.index({ active: 1, createdAt: -1 });
habitSchema.index({ userId: 1 });
habitSchema.index({ goalType: 1 });
habitSchema.index({ active: 1 });
habitSchema.index({ createdAt: -1 });
habitSchema.index({
    name: 'text',
    description: 'text'
}, {
    weights: {
        name: 10,
        description: 1
    }
});
exports.Habit = mongoose_1.default.model('Habit', habitSchema);
//# sourceMappingURL=Habit.js.map