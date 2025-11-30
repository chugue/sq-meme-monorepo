"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletAddress = void 0;
const common_1 = require("@nestjs/common");
exports.WalletAddress = (0, common_1.createParamDecorator)((data = { required: true }, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const walletAddress = request.headers['x-wallet-address'];
    if (data.required && !walletAddress) {
        throw new common_1.BadRequestException('x-wallet-address 헤더가 필요합니다');
    }
    return walletAddress?.toLowerCase();
});
//# sourceMappingURL=wallet-address.decorator.js.map