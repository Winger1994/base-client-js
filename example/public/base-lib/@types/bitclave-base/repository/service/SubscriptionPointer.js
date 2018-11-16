"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Object represents the pointer entry stored at clients side
 * after successfully subscribe to a service
 * {type: {spid, schema}}
 */
var SubscriptionPointer = /** @class */ (function () {
    function SubscriptionPointer(spid, serviceType) {
        this.spid = spid;
        this.schema = SubscriptionPointer.UID + SubscriptionPointer.SEP + SubscriptionPointer.BID + SubscriptionPointer.SEP + serviceType;
    }
    SubscriptionPointer.SEP = '_';
    SubscriptionPointer.SPID = 'spid';
    SubscriptionPointer.UID = 'uid';
    SubscriptionPointer.BID = 'bid';
    return SubscriptionPointer;
}());
exports.default = SubscriptionPointer;
//# sourceMappingURL=SubscriptionPointer.js.map