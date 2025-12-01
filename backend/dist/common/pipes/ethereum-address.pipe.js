"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumAddressPipe = void 0;
const common_1 = require("@nestjs/common");
class EthereumAddressPipe {
    addressRegex = /^0x[a-fA-F0-9]{40}$/;
    transform(value) {
        if (!value || !this.addressRegex.test(value)) {
            throw new common_1.BadRequestException('유효한 이더리움 주소가 아닙니다');
        }
        return value.toLowerCase();
    }
}
exports.EthereumAddressPipe = EthereumAddressPipe;
//# sourceMappingURL=ethereum-address.pipe.js.map