/**
 * Service object encapsulates the ServiceInfo object and
 * methods to manage the subscribers
 */
export interface Service {
  toJsonString(): string;
  addSubscriber(uid: string): void;
  removeSubscriber(uid: string): void;
  updateData(uid: string, data: string): void;
}

export class ServiceInfo {
  public type: string;
  public id: string;
  public description: string;
  public requiredKeys: Array<string>;

  constructor(type:string, id:string, description:string, requiredKeys:Array<string>){
    this.type = type;
    this.id = id;
    this.description = description;
    this.requiredKeys = requiredKeys;
  }
}