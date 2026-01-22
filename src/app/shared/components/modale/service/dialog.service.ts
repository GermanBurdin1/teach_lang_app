import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { map, Observable } from 'rxjs';
import {
  InstallDialogComponent,
  UniversalDialogData,
  UniversalDialogResult,
} from '../modale.component';

@Injectable({ providedIn: 'root' })
export class DialogService {
  constructor(private dialog: MatDialog) {}

  openUniversal(data: UniversalDialogData): Observable<UniversalDialogResult> {
    return this.dialog
      .open<InstallDialogComponent, UniversalDialogData, UniversalDialogResult>(InstallDialogComponent, {
        width: '600px',
        maxHeight: '80vh',
        data,
      })
      .afterClosed()
      .pipe(map((res) => res ?? { confirmed: false }));
  }

  // опционально: удобный confirm-алиас
  confirm(data: Omit<UniversalDialogData, 'fields'>): Observable<boolean> {
    return this.openUniversal(data).pipe(map(r => r.confirmed));
  }
}

