import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { map, Observable } from 'rxjs';
import {
  InstallDialogComponent,
  InstallDialogData,
  InstallDialogResult,
} from '../modale.component';

@Injectable({ providedIn: 'root' })
export class DialogService {
  constructor(private dialog: MatDialog) {}

  openInstall(data: InstallDialogData = {}): Observable<InstallDialogResult> {
    return this.dialog
      .open<InstallDialogComponent, InstallDialogData, InstallDialogResult>(InstallDialogComponent, {
        width: '600px',
        maxHeight: '80vh',
        data,
      })
      .afterClosed()
      .pipe(map((res) => !!res));
  }
}
