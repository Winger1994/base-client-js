import {Service, ServiceInfo} from '../repository/service/Service';

export interface SubscriptionManager{
  
  announceService(service: Service): void;

  queryService(spid: string): Promise<ServiceInfo>;

  subscribe(serviceInfo: ServiceInfo): boolean;
}