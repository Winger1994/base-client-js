"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Object represents the pointer entry stored at clients side
 * after successfully subscribe to a service
 * {type: {spid, schema}}
 */
var Pointer = /** @class */ (function () {
    function Pointer(spid, serviceType) {
        this.spid = spid;
        this.schema = Pointer.UID + Pointer.SEP + Pointer.BID + Pointer.SEP + serviceType;
    }
    Pointer.SEP = '_';
    Pointer.SPID = 'spid';
    Pointer.UID = 'uid';
    Pointer.BID = 'bid';
    return Pointer;
}());
exports.default = Pointer;
//# sourceMappingURL=Pointer.js.map