// landing-data.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LandingDataService {
  private data: any = {};

  setData(key: string, value: any): void {
    this.data[key] = value;
  }

  getData(key: string): any {
    return this.data[key] || null;
  }

  getAllData(): any {
    return { ...this.data };
  }
}
