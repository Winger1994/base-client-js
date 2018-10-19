export interface Service {
  getServiceInfo(): ServiceInfo;
  toJsonString(): string;
  addSubscriber(uid: string): void;
  removeSubscriber(uid: string): void;
  updateData(uid: string): void;
}

export class ServiceInfo {
  public type: string;
  public id: string;
  public description: string;
  public requiredKeys: Array<string>;
}