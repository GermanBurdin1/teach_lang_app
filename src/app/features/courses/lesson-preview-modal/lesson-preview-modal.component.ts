import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogConfig } from '@angular/material/dialog';
import { UploadedFile } from '../../../services/file-upload.service';
import { HomeworkService } from '../../../services/homework.service';
import { AuthService } from '../../../services/auth.service';
import { RoleService } from '../../../services/role.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { HomeworkModalComponent, HomeworkModalData } from '../../../classroom/lesson-material/homework-modal/homework-modal.component';
import { SupplementaryMaterialsModalComponent, SupplementaryMaterialsModalData } from './supplementary-materials-modal/supplementary-materials-modal.component';
import { DrillGridModalComponent, DrillGridModalData, DrillGrid, DrillGridCell } from '../../mindmap/drill-grid-modal/drill-grid-modal.component';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';
import { forkJoin } from 'rxjs';

export interface LessonPreviewModalData {
  lessonName: string;
  section: string;
  subSection?: string;
  materials: UploadedFile[];
  courseId: string;
  courseLessonId?: string; // ID урока курса (course_lessons.id)
  description?: string;
  lessonType?: 'self' | 'call'; // Тип урока
}

@Component({
  selector: 'app-lesson-preview-modal',
  templateUrl: './lesson-preview-modal.component.html',
  styleUrls: ['./lesson-preview-modal.component.css']
})
export class LessonPreviewModalComponent implements OnInit, OnDestroy {
  lessonDescription = '';
  homeworkItems: any[] = [];
  loadingHomework = false;
  isFullscreen = false;
  private materialAddedListener?: EventListener;
  
  // Получить дополнительные материалы (конструкторы: drill-grid, mindmap и т.д.)
  // Определяем по наличию constructorId или drillGridData
  get supplementaryMaterials(): UploadedFile[] {
    return this.data.materials.filter(material => {
      // Проверяем, что материал привязан к текущему уроку по courseLessonId
      const materialCourseLessonId = (material as any).courseLessonId;
      const materialCourseLessonIds = Array.isArray((material as any).courseLessonIds) ? (material as any).courseLessonIds : [];
      
      const hasMatchingCourseLessonId = this.data.courseLessonId && (
        materialCourseLessonId === this.data.courseLessonId ||
        materialCourseLessonIds.includes(this.data.courseLessonId)
      );
      
      // Материал является дополнительным (конструктором), если:
      // 1. Привязан к текущему уроку по courseLessonId
      // 2. Имеет constructorId или drillGridData
      return hasMatchingCourseLessonId && (
        !!(material as any).constructorId || 
        !!(material as any).drillGridData ||
        material.mimetype === 'application/json' // JSON файлы обычно конструкторы
      );
    });
  }
  
  // Получить обычные материалы (не конструкторы)
  get regularMaterials(): UploadedFile[] {
    return this.data.materials.filter(material => {
      // Проверяем, что материал привязан к текущему уроку по courseLessonId
      const materialCourseLessonId = (material as any).courseLessonId;
      const materialCourseLessonIds = Array.isArray((material as any).courseLessonIds) ? (material as any).courseLessonIds : [];
      
      const hasMatchingCourseLessonId = this.data.courseLessonId && (
        materialCourseLessonId === this.data.courseLessonId ||
        materialCourseLessonIds.includes(this.data.courseLessonId)
      );
      
      // Материал является обычным, если:
      // 1. Привязан к текущему уроку по courseLessonId
      // 2. НЕ является конструктором (нет constructorId и drillGridData)
      return hasMatchingCourseLessonId && 
        !(material as any).constructorId && 
        !(material as any).drillGridData &&
        material.mimetype !== 'application/json';
    });
  }

  constructor(
    public dialogRef: MatDialogRef<LessonPreviewModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LessonPreviewModalData,
    private homeworkService: HomeworkService,
    private authService: AuthService,
    private roleService: RoleService,
    private http: HttpClient,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadHomework();
    // Загружаем описание урока из data (передается из структуры lessons)
    if (this.data.description) {
      this.lessonDescription = this.data.description;
    } else {
      // Для обратной совместимости проверяем localStorage
      const subSectionPart = this.data.subSection ? `${this.data.subSection}_` : '';
      const savedDescription = localStorage.getItem(`lesson_description_${this.data.courseId}_${this.data.section}_${subSectionPart}${this.data.lessonName}`);
      if (savedDescription) {
        this.lessonDescription = savedDescription;
        // Миграция: сохраняем описание из localStorage в структуру lessons при первом открытии
        this.saveDescription();
      }
    }
    
    // Слушаем событие добавления материала для обновления списка
    this.materialAddedListener = ((event: CustomEvent) => {
      if (event.detail && event.detail.material) {
        const material = event.detail.material;
        
        // ИСПОЛЬЗУЕМ courseLessonId КАК ОСНОВНОЙ ИДЕНТИФИКАТОР
        // Поддерживаем many-to-many: один файл может быть привязан к нескольким урокам
        const materialCourseLessonIds = (material as any).courseLessonIds || [];
        const materialCourseLessonId = material.courseLessonId; // Для обратной совместимости
        
        const hasMatchingCourseLessonId = this.data.courseLessonId && (
          materialCourseLessonId === this.data.courseLessonId ||
          materialCourseLessonIds.includes(this.data.courseLessonId)
        );
        
        // ТОЛЬКО по courseLessonId - без fallback на теги
        if (hasMatchingCourseLessonId) {
          // Добавляем материал в список, если его там еще нет
          if (!this.data.materials.find(m => m.id === material.id)) {
            this.data.materials.push(material);
          }
        }
      }
    }) as EventListener;
    window.addEventListener('materialAdded', this.materialAddedListener);
    
    // Слушаем событие обновления материала (когда материал сохраняется на сервер)
    window.addEventListener('materialUpdated', ((event: CustomEvent) => {
      if (event.detail && event.detail.oldId && event.detail.newMaterial) {
        const { oldId, newMaterial } = event.detail;
        // Проверяем, относится ли материал к текущему уроку
        // ИСПОЛЬЗУЕМ courseLessonId КАК ОСНОВНОЙ ИДЕНТИФИКАТОР
        // Поддерживаем many-to-many: один файл может быть привязан к нескольким урокам
        const newMaterialCourseLessonIds = (newMaterial as any).courseLessonIds || [];
        const newMaterialCourseLessonId = newMaterial.courseLessonId; // Для обратной совместимости
        
        const hasMatchingCourseLessonId = this.data.courseLessonId && (
          newMaterialCourseLessonId === this.data.courseLessonId ||
          newMaterialCourseLessonIds.includes(this.data.courseLessonId)
        );
        
        // ТОЛЬКО по courseLessonId - без fallback на теги
        if (hasMatchingCourseLessonId) {
          // Находим материал по старому ID и обновляем его
          const index = this.data.materials.findIndex(m => m.id === oldId);
          if (index !== -1) {
            console.log(`🔄 Обновление материала в модалке: старый ID ${oldId} -> новый ID ${newMaterial.id}`);
            this.data.materials[index] = newMaterial;
          } else {
            // Если материал не найден по старому ID, добавляем новый
            console.log(`➕ Добавление обновленного материала в модалку: ID ${newMaterial.id}`);
            this.data.materials.push(newMaterial);
          }
        }
      }
    }) as EventListener);
  }

  ngOnDestroy(): void {
    // Удаляем слушатель события при уничтожении компонента
    if (this.materialAddedListener) {
      window.removeEventListener('materialAdded', this.materialAddedListener);
    }
  }

  homeworkByMaterial: { [materialId: string]: any[] } = {};
  lessonHomeworkItems: any[] = [];

  loadHomework(): void {
    this.loadingHomework = true;
    const subSectionPart = this.data.subSection ? `${this.data.subSection}_` : '';
    const lessonItemId = `${this.data.courseId}_${this.data.section}_${subSectionPart}${this.data.lessonName}`;
    
    // ВСЕГДА загружаем задания к материалам (для отображения под материалами)
    // И общие задания урока (для отображения в lesson-homework-section)
    const sourceItemIds: string[] = [lessonItemId];
    
    // Добавляем sourceItemId для каждого материала (для всех типов уроков)
    // Включаем как обычные материалы, так и дополнительные
    this.data.materials.forEach(material => {
      const materialItemId = `${this.data.courseId}_${this.data.section}_${subSectionPart}${this.data.lessonName}_material_${material.id}`;
      sourceItemIds.push(materialItemId);
    });

    // Загружаем шаблоны курсов для всех sourceItemId
    const homeworkObservables = sourceItemIds.map(itemId => 
      this.homeworkService.getCourseTemplateHomeworkBySourceItemId(itemId)
    );

    // Объединяем все запросы
    forkJoin(homeworkObservables).subscribe({
        next: (homeworkArrays) => {
          // Разделяем задания на привязанные к материалам и общие к уроку
          this.homeworkByMaterial = {};
          this.lessonHomeworkItems = [];
          
          homeworkArrays.forEach((homeworkList, index) => {
            const itemId = sourceItemIds[index];
            homeworkList.forEach(hw => {
              // Преобразуем формат из backend в формат для фронтенда
              const homeworkItem = {
                ...hw,
                sourceItemId: itemId,
                dueDate: hw.dueDate ? new Date(hw.dueDate) : null
              };
              
              if (itemId.includes('_material_')) {
                // Задания к материалам (отображаются под каждым материалом)
                const materialId = itemId.split('_material_')[1];
                if (!this.homeworkByMaterial[materialId]) {
                  this.homeworkByMaterial[materialId] = [];
                }
                this.homeworkByMaterial[materialId].push(homeworkItem);
              } else if (itemId === lessonItemId) {
                // Общие задания урока (отображаются в lesson-homework-section)
                this.lessonHomeworkItems.push(homeworkItem);
              }
            });
          });
          
          // homeworkItems используется только для общего подсчета в заголовке
          // Для уроков типа 'self' в lesson-homework-section показываем только lessonHomeworkItems
          // Для уроков типа 'call' можно показывать все, но мы все равно показываем только lessonHomeworkItems
          this.homeworkItems = [...this.lessonHomeworkItems];
          Object.values(this.homeworkByMaterial).forEach(materialHw => {
            this.homeworkItems.push(...materialHw);
          });
          
          this.loadingHomework = false;
        },
        error: (error) => {
          console.error('Ошибка загрузки домашних заданий:', error);
          this.homeworkItems = [];
          this.homeworkByMaterial = {};
          this.lessonHomeworkItems = [];
          this.loadingHomework = false;
        }
      });
  }

  getHomeworkForMaterial(materialId: number): any[] {
    return this.homeworkByMaterial[materialId?.toString()] || [];
  }

  saveDescription(): void {
    // Отправляем событие для обновления структуры lessons и сохранения в БД
    window.dispatchEvent(new CustomEvent('lessonDescriptionUpdated', {
      detail: {
        courseId: this.data.courseId,
        section: this.data.section,
        subSection: this.data.subSection,
        lessonName: this.data.lessonName,
        description: this.lessonDescription
      }
    }));
  }


  getFileUrl(url: string | null | undefined): string {
    if (!url) return '#';
    
    // Если URL уже полный, возвращаем его
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url.replace('http://135.125.107.45:3011', 'http://localhost:3011');
    }
    
    // Если URL относительный, добавляем базовый путь
    if (url.startsWith('/')) {
      return `http://localhost:3011${url}`;
    }
    
    return `http://localhost:3011/files/uploads/${url}`;
  }

  getMaterialTypeIcon(mimetype: string): string {
    if (!mimetype) return 'fas fa-file';
    
    if (mimetype.includes('audio')) return 'fas fa-volume-up';
    if (mimetype.includes('video')) return 'fas fa-video';
    if (mimetype.includes('image')) return 'fas fa-image';
    if (mimetype.includes('pdf')) return 'fas fa-file-pdf';
    if (mimetype.includes('text')) return 'fas fa-file-text';
    if (mimetype.includes('json')) return 'fas fa-grid-on'; // Drill-grid icon
    
    return 'fas fa-file';
  }

  getMaterialTypeFromMime(mimetype: string): string {
    if (!mimetype) return 'file';
    
    if (mimetype.includes('audio')) return 'audio';
    if (mimetype.includes('video')) return 'video';
    if (mimetype.includes('image')) return 'image';
    if (mimetype.includes('pdf')) return 'pdf';
    if (mimetype.includes('text')) return 'text';
    if (mimetype.includes('json')) return 'drill_grid'; // Drill-grid сохраняется как JSON
    
    return 'file';
  }
  
  // Проверить, является ли материал drill-grid
  isDrillGrid(material: UploadedFile): boolean {
    return (material as any).drillGridData?.type === 'drill_grid' || 
           material.mimetype === 'application/json';
  }
  
  // Получить данные drill-grid из материала
  getDrillGridData(material: UploadedFile): any {
    return (material as any).drillGridData?.data || null;
  }

  // Получить массив строк для rows (поддержка обоих форматов)
  getDrillGridRowsArray(material: UploadedFile): string[] {
    const data = this.getDrillGridData(material);
    if (!data || !data.rows) {
      return [];
    }
    if (Array.isArray(data.rows)) {
      if (data.rows.length > 0 && typeof data.rows[0] === 'object' && 'label' in data.rows[0]) {
        return (data.rows as Array<{id: string; label: string}>).map(r => r.label);
      } else {
        return data.rows as string[];
      }
    }
    return [];
  }

  // Получить массив строк для columns (поддержка обоих форматов)
  getDrillGridColumnsArray(material: UploadedFile): string[] {
    const data = this.getDrillGridData(material);
    if (!data || !data.columns) {
      return [];
    }
    if (Array.isArray(data.columns)) {
      if (data.columns.length > 0 && typeof data.columns[0] === 'object' && 'label' in data.columns[0]) {
        return (data.columns as Array<{id: string; label: string}>).map(c => c.label);
      } else {
        return data.columns as string[];
      }
    }
    return [];
  }

  // Получить содержимое ячейки (поддержка обоих форматов cells)
  getDrillGridCellContent(material: UploadedFile, rowIdx: number, colIdx: number): string {
    const data = this.getDrillGridData(material);
    if (!data || !data.cells) {
      return '';
    }

    // Новый формат: массив DrillGridCell
    if (Array.isArray(data.cells)) {
      const expectedRowId = `row_${rowIdx}`;
      const expectedColId = `col_${colIdx}`;
      
      const cell = data.cells.find((c: any) => 
        c.rowId === expectedRowId && c.colId === expectedColId
      );
      
      if (cell && cell.content) {
        return cell.content;
      }
      
      // Если не нашли, логируем для отладки (только в режиме разработки)
      if (cell && !cell.content) {
        console.warn('⚠️ Ячейка найдена, но content пустой', {
          material: material.filename,
          rowIdx,
          colIdx,
          cell
        });
      }
    }

    // Старый формат: объект { "0-0": "content" } или { "0_1": "content" }
    if (typeof data.cells === 'object' && !Array.isArray(data.cells)) {
      // Пробуем разные форматы ключей
      const keys = [`${rowIdx}-${colIdx}`, `${rowIdx}_${colIdx}`];
      for (const key of keys) {
        const value = data.cells[key];
        if (value !== undefined) {
          // Если значение - объект, пытаемся извлечь content
          if (typeof value === 'object' && value !== null && 'content' in value) {
            return value.content || '';
          }
          // Если значение - строка, возвращаем её
          if (typeof value === 'string') {
            return value;
          }
        }
      }
    }

    return '';
  }

  // Открыть drill-grid в полном режиме просмотра
  openDrillGridFullscreen(material: UploadedFile): void {
    const constructorId = (material as any).constructorId;
    if (!constructorId) {
      console.error('❌ ConstructorId не найден для материала:', material);
      return;
    }

    const token = this.authService.getAccessToken();
    if (!token) {
      console.error('❌ Токен не найден');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    // Загружаем данные drill-grid с сервера
    this.http.get(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}/drill-grid`, { headers }).subscribe({
      next: (drillGridData: any) => {
        // Получаем данные конструктора для названия
        this.http.get(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}`, { headers }).subscribe({
          next: (constructor: any) => {
            // Преобразуем данные в формат для модалки
            const drillGrid: DrillGrid = {
              id: constructorId,
              name: constructor.name || material.filename,
              rows: drillGridData.rows || [],
              columns: drillGridData.columns || [],
              cells: drillGridData.cells || {},
              purpose: drillGridData.purpose || 'info',
              type: drillGridData.purpose || 'info',
              createdAt: new Date(constructor.createdAt || Date.now()),
              constructorId: constructorId
            };

            // Преобразуем rows и columns в массивы строк
            const drillGridRows: string[] = Array.isArray(drillGrid.rows) 
              ? (typeof drillGrid.rows[0] === 'object' 
                  ? (drillGrid.rows as Array<{id: string; label: string}>).map(r => r.label)
                  : drillGrid.rows as string[])
              : [];

            const drillGridColumns: string[] = Array.isArray(drillGrid.columns)
              ? (typeof drillGrid.columns[0] === 'object'
                  ? (drillGrid.columns as Array<{id: string; label: string}>).map(c => c.label)
                  : drillGrid.columns as string[])
              : [];

            // Преобразуем cells в нужный формат
            let drillGridCells: { [key: string]: string } = {};
            let drillGridCellsData: DrillGridCell[] = [];

            if (Array.isArray(drillGrid.cells)) {
              // Новый формат: массив DrillGridCell
              drillGridCellsData = drillGrid.cells as DrillGridCell[];
              drillGridCellsData.forEach(cell => {
                const rowIdx = parseInt(cell.rowId.replace('row_', ''));
                const colIdx = parseInt(cell.colId.replace('col_', ''));
                drillGridCells[`${rowIdx}-${colIdx}`] = cell.content || '';
              });
            } else if (typeof drillGrid.cells === 'object') {
              // Старый формат: объект { "0-0": "content" }
              drillGridCells = drillGrid.cells as { [key: string]: string };
              Object.keys(drillGridCells).forEach(key => {
                const [rowIdx, colIdx] = key.split('-').map(Number);
                drillGridCellsData.push({
                  rowId: `row_${rowIdx}`,
                  colId: `col_${colIdx}`,
                  content: drillGridCells[key] || '',
                  correctAnswer: undefined,
                  isEditable: true
                });
              });
            }

            const dialogConfig: MatDialogConfig = {
              width: '100vw',
              height: '100vh',
              maxWidth: '100vw',
              maxHeight: '100vh',
              panelClass: 'drill-grid-fullscreen-modal',
              data: {
                mode: 'preview' as 'preview',
                drillGridName: drillGrid.name,
                drillGridRows: drillGridRows,
                drillGridColumns: drillGridColumns,
                drillGridCells: drillGridCells,
                drillGridCellsData: drillGridCellsData,
                drillGridPurpose: drillGrid.purpose || 'info',
                editingDrillGrid: drillGrid
              } as DrillGridModalData,
              disableClose: false,
              hasBackdrop: true
            };

            this.dialog.open(DrillGridModalComponent, dialogConfig);
          },
          error: (error) => {
            console.error('❌ Ошибка загрузки конструктора:', error);
          }
        });
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки drill-grid:', error);
      }
    });
  }

  openAddMaterial(): void {
    // Не закрываем текущее модальное окно, а передаем данные через событие для открытия модалки материалов поверх
    const event = new CustomEvent('openMaterialModal', {
      detail: {
        action: 'addMaterial',
        section: this.data.section,
        lesson: this.data.lessonName,
        subSection: this.data.subSection,
        isSupplementary: false
      }
    });
    window.dispatchEvent(event);
  }

  openAddSupplementaryMaterial(): void {
    // Открываем модальное окно для выбора материалов из конструктора
    const modalData: SupplementaryMaterialsModalData = {
      section: this.data.section,
      lesson: this.data.lessonName,
      subSection: this.data.subSection,
      courseId: this.data.courseId,
      courseLessonId: this.data.courseLessonId
    };

    const dialogRef = this.dialog.open(SupplementaryMaterialsModalComponent, {
      width: '800px',
      maxWidth: '90vw',
      maxHeight: '80vh',
      data: modalData,
      panelClass: 'supplementary-materials-modal-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'addDrillGrid') {
        // Добавляем drill-grid как дополнительный материал
        const material = result.material;
        
        // НЕ формируем тег - используем только courseLessonId
        // Материал уже имеет courseLessonId из supplementary-materials-modal
        const supplementaryMaterial: UploadedFile = {
          ...material,
          courseId: this.data.courseId,
          courseLessonId: this.data.courseLessonId // Убеждаемся, что courseLessonId установлен
        };

        // Проверяем, что материала еще нет в списке (по ID)
        const existingMaterial = this.data.materials.find(m => m.id === material.id);
        if (!existingMaterial) {
          this.data.materials.push(supplementaryMaterial);
          
          // Отправляем событие для сохранения материала на сервер через saveConstructorMaterial
          // Это нужно для того, чтобы материал был привязан к уроку через courseLessonId
          window.dispatchEvent(new CustomEvent('materialAdded', {
            detail: { material: supplementaryMaterial }
          }));
        } else {
          // Если материал уже есть, обновляем его вместо добавления дубликата
          const index = this.data.materials.indexOf(existingMaterial);
          this.data.materials[index] = supplementaryMaterial;
          
          // Отправляем событие обновления материала
          window.dispatchEvent(new CustomEvent('materialUpdated', {
            detail: {
              oldId: existingMaterial.id,
              newMaterial: supplementaryMaterial
            }
          }));
        }
      }
    });
  }

  openAddHomework(materialId?: number): void {
    let itemId: string;
    let title: string;
    
    if (materialId) {
      // Задание к конкретному материалу
      const subSectionPart = this.data.subSection ? `${this.data.subSection}_` : '';
      itemId = `${this.data.courseId}_${this.data.section}_${subSectionPart}${this.data.lessonName}_material_${materialId}`;
      const material = this.data.materials.find(m => m.id === materialId);
      title = material ? material.filename : this.data.lessonName;
    } else {
      // Общее задание к уроку
      const subSectionPart = this.data.subSection ? `${this.data.subSection}_` : '';
      itemId = `${this.data.courseId}_${this.data.section}_${subSectionPart}${this.data.lessonName}`;
      title = this.data.lessonName;
    }
    
    // Получаем текущего пользователя для сохранения на сервер
    const currentUser = this.authService.getCurrentUser();
    
    const dialogData: HomeworkModalData = {
      type: 'material',
      title: title,
      itemId: itemId,
      isCourseTemplate: true, // Помечаем как шаблон курса
      courseId: this.data.courseId,
      createdBy: currentUser?.id || ''
    };

    const homeworkDialogRef = this.dialog.open(HomeworkModalComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: dialogData
    });

    homeworkDialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('✅ Devoir créé:', result);
        // Перезагружаем домашние задания после создания
        setTimeout(() => {
          this.loadHomework();
        }, 500); // Небольшая задержка для обновления на сервере
      }
    });
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    
    if (this.isFullscreen) {
      // Разворачиваем на полный экран
      this.dialogRef.updateSize('100vw', '100vh');
      this.dialogRef.addPanelClass('lesson-preview-fullscreen');
    } else {
      // Восстанавливаем обычный размер
      this.dialogRef.updateSize('900px', '90vh');
      this.dialogRef.removePanelClass('lesson-preview-fullscreen');
    }
  }

  saveLessonInfo(): void {
    // Сохраняем описание урока
    this.saveDescription();
    
    // Отправляем событие для сохранения материалов в структуру курса
    window.dispatchEvent(new CustomEvent('lessonMaterialsUpdated', {
      detail: {
        courseId: this.data.courseId,
        section: this.data.section,
        subSection: this.data.subSection,
        lessonName: this.data.lessonName,
        materials: this.data.materials
      }
    }));
  }

  close(): void {
    // При закрытии модалки НЕ сохраняем автоматически - только закрываем
    this.dialogRef.close();
  }
}

