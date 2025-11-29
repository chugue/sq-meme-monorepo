"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Result = void 0;
exports.Result = {
    ok: (data) => ({ success: true, data }),
    fail: (errorMessage) => ({ success: false, errorMessage }),
};
//# sourceMappingURL=result.type.js.map