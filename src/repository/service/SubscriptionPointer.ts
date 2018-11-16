/**
 * Object represents the pointer entry stored at clients side
 * after successfully subscribe to a service
 * {type: {spid, schema}}
 */
export default class SubscriptionPointer {
    public static SEP: string = '_';
    public static SPID: string = 'spid';
    public static UID: string = 'uid';
    public static BID: string = 'bid';

    public spid: string;
    public schema: string;

    constructor(spid: string, serviceType: string) {
        this.spid = spid;
        this.schema = SubscriptionPointer.UID + SubscriptionPointer.SEP + SubscriptionPointer.BID + SubscriptionPointer.SEP + serviceType;
    }
}