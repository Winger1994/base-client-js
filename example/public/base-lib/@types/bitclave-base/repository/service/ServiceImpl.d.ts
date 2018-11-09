import { Service, ServiceInfo } from './Service';
import { ProfileManager } from '../../manager/ProfileManager';
import { DataRequestManager } from '../../manager/DataRequestManager';
export declare class ServiceImpl implements Service {
    static SUBSCRIPTION_PROCESSING: string;
    static SUBSCRIPTION_DENY: string;
    private subscribers;
    private profileManager;
    private dataRequestManager;
    private _serviceInfo;
    constructor(serviceInfo: ServiceInfo, profileManager: ProfileManager, dataRequestManager: DataRequestManager);
    readonly serviceInfo: ServiceInfo;
    toJsonString(): string;
    addSubscriber(uid: string): Promise<void>;
    removeSubscriber(uid: string): Promise<void>;
    updateData(uid: string, data: string): Promise<void>;
}
