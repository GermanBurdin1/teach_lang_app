import { MatPaginatorIntl } from '@angular/material/paginator';

export function getCosmicPaginatorIntl() {
  const paginatorIntl = new MatPaginatorIntl();

  paginatorIntl.itemsPerPageLabel = 'Cours par page :';
  paginatorIntl.nextPageLabel = 'Cours suivants';
  paginatorIntl.previousPageLabel = 'Cours précédents';
  paginatorIntl.firstPageLabel = 'Première page';
  paginatorIntl.lastPageLabel = 'Dernière page';
  paginatorIntl.getRangeLabel = (page, pageSize, length) => {
    if (length === 0 || pageSize === 0) {
      return '0 sur 0';
    }
    const startIndex = page * pageSize;
    const endIndex = Math.min(startIndex + pageSize, length);
    return `${startIndex + 1} – ${endIndex} sur ${length}`;
  };

  return paginatorIntl;
}
