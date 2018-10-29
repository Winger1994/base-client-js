import {Service, ServiceInfo} from '../repository/service/Service';

export interface SubscriptionManager{

  getServiceProviders(serviceType: string): Promise<Array<string>>;

  getServiceInfo(spid: string): Promise<ServiceInfo>;

  subscribe(serviceInfo: ServiceInfo): Promise<boolean>;
  
  announceService(service: Service): void;

  getProcessedData(spid: string): Promise<string>;

  getSubscriptions(): Map<string, ServiceInfo>;
}