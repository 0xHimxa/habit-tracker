"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const options = {
    hostname: 'localhost',
    port: process.env.PORT || 3001,
    path: '/health',
    timeout: 3000,
};
const req = http_1.default.request(options, (res) => {
    if (res.statusCode === 200) {
        process.exit(0);
    }
    else {
        process.exit(1);
    }
});
req.on('error', () => {
    process.exit(1);
});
req.end();
//# sourceMappingURL=health-check.js.map