import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  public cache(key: string, value: any) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  public getCache(key: string) {
    const value = localStorage.getItem(key);

    if (value) {
      return JSON.parse(value);
    }

    return undefined;
  }
}
