import { Component, OnInit, OnDestroy } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { HomeworkService } from '../../../services/homework.service';
import { LessonService } from '../../../services/lesson.service';
import { AuthService } from '../../../services/auth.service';
import { MaterialService } from '../../../services/material.service';
import { CourseService, Course } from '../../../services/course.service';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoCallService } from '../../../services/video-call.service';
import { Subscription } from 'rxjs';
import { LessonTabsService } from '../../../services/lesson-tabs.service';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';

interface HomeworkItem {
  id?: string;
  title: string;
  description?: string;
  status?: string;
  [key: string]: unknown;
}
import { LessonNotesService, LessonNote, LessonNotesData } from '../../../services/lesson-notes.service';

interface Task {
  id: string;
  lessonId: string;
  title: string;
  description: string | null;
  createdBy: string;
  createdByRole: 'student' | 'teacher';
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;
}

interface Question {
  id: string;
  lessonId: string;
  question: string;
  answer: string | null;
  createdBy: string;
  createdByRole: 'student' | 'teacher';
  isAnswered: boolean;
  answeredAt: Date | null;
  createdAt: Date;
}

interface Material {
  id: string;
  title: string;
  type: 'text' | 'audio' | 'video' | 'pdf' | 'image';
  content: string;
  description?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  attachedLessons: string[];
  tags: string[];
}

interface Lesson {
  id: string;
  teacherId: string;
  studentId: string;
  scheduledAt: Date;
  status: string;
  teacherName?: string;
  tasks: Task[];
  questions: Question[];
  materials: Material[];
  // Дополнительные поля для уроков из курса
  courseId?: number;
  courseTitle?: string;
  section?: string;
  subSection?: string;
  lessonName?: string;
  plannedDurationMinutes?: number | null;
  description?: string | null;
  isFromCourse?: boolean;
}

@Component({
  selector: 'app-lesson-management',
  templateUrl: './lesson-management.component.html',
  styleUrls: ['./lesson-management.component.css']
})
export class LessonManagementComponent implements OnInit, OnDestroy {
  // UI состояние
  filter: string = 'future';
  selectedTeacher: string | null = null;
  selectedCourse: number | null = null;
  highlightedLessonId: string | null = null;
  activePanel: 'cours' | 'settings' | 'stats' = 'cours';
  hideTabs = true;
  searchTerm = '';
  startDate?: string;
  endDate?: string;
  pageSize = 4;
  currentPage = 1;
  showMoreNotifications = false;
  readonly MAX_NOTIFICATIONS = 10;

  // Данные
  lessons: Lesson[] = [];
  courseLessons: Lesson[] = []; // Уроки из курсов
  courses: Course[] = [];
  currentLesson: Lesson | null = null;
  
  // Домашние задания и конспекты
  homeworkItems: HomeworkItem[] = [];
  lessonNotes: unknown = null;
  
  // Формы для добавления
  showAddTaskForm = false;
  showAddQuestionForm = false;
  newTaskTitle = '';
  newTaskDescription = '';
  newQuestionText = '';
  
  // Загрузка
  loading = false;
  
  // Параметры URL
  highlightedLessonIdFromUrl: string | null = null;

  // Управление раскрывающимися панелями
  expandedTasks: Set<string> = new Set();
  expandedQuestions: Set<string> = new Set();
  expandedMaterials: Set<string> = new Set();

  private subscriptions: Subscription[] = [];

  constructor(
    private homeworkService: HomeworkService,
    private lessonService: LessonService,
    private authService: AuthService,
    private materialService: MaterialService,
    private courseService: CourseService,
    private route: ActivatedRoute,
    private router: Router,
    private videoCallService: VideoCallService,
    private lessonTabsService: LessonTabsService,
    private lessonNotesService: LessonNotesService,
    private title: Title,
    private meta: Meta
  ) { }

  ngOnInit(): void {
    this.updateSEOTags();
    
    this.route.params.subscribe(params => {
      this.highlightedLessonIdFromUrl = params['lessonId'] || null;
      console.log('📋 LessonManagement: Получен lessonId из URL:', this.highlightedLessonIdFromUrl);
    });

    this.route.queryParams.subscribe(params => {
      // Если есть lessonId в query params, используем его
      if (params['lessonId']) {
        this.highlightedLessonIdFromUrl = params['lessonId'];
        console.log('📋 LessonManagement: Получен lessonId из query params:', this.highlightedLessonIdFromUrl);
      }
      
    });

    this.loadStudentLessons();
    this.loadCourses();

    // Если есть выделенный урок из URL, загружаем его
    if (this.highlightedLessonIdFromUrl) {
      setTimeout(() => {
        this.loadLesson(this.highlightedLessonIdFromUrl!);
      }, 500);
    }
    
    // Подписка на уведомления о прикреплении материалов
    const materialAttachedSubscription = this.materialService.onMaterialAttached().subscribe(({ materialId, lessonId }) => {
      console.log('🔗 Получено уведомление о прикреплении материала:', { materialId, lessonId });
      
      // Если материал прикреплен к текущему уроку, перезагружаем материалы
      if (this.currentLesson && this.currentLesson.id === lessonId) {
        console.log('🔄 Перезагружаем материалы для текущего урока');
        this.reloadMaterialsForCurrentLesson();
      }
      
      // Также обновляем материалы в списке уроков
      const lessonInList = this.lessons.find(l => l.id === lessonId);
      if (lessonInList) {
        console.log('🔄 Перезагружаем материалы для урока в списке');
        this.getMaterialsForLesson(lessonId).then(materials => {
          lessonInList.materials = materials;
        });
      }
    });

    this.subscriptions.push(materialAttachedSubscription);
    
    // Подписка на обновления домашних заданий
    const homeworkUpdatedSubscription = this.homeworkService.onHomeworkUpdated().subscribe(() => {
      console.log('📋 Получено уведомление об обновлении домашних заданий');
      if (this.currentLesson) {
        this.loadHomeworkItems(this.currentLesson.id);
      }
    });
    
    this.subscriptions.push(homeworkUpdatedSubscription);
    

  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  // Загрузка курсов
  loadCourses(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) return;

    this.courseService.getCoursesByTeacher().subscribe({
      next: (courses) => {
        this.courses = courses;
        console.log('📚 Загружены курсы:', courses);
      },
      error: (error) => {
        console.error('Ошибка загрузки курсов:', error);
      }
    });
  }

  // Загрузка уроков из курса
  loadCourseLessons(courseId: number): void {
    if (!courseId) {
      this.courseLessons = [];
      return;
    }

    this.loading = true;
    
    // Загружаем полную информацию о курсе
    this.courseService.getCourseById(courseId).subscribe({
      next: (course) => {
        console.log('📚 Загружен курс:', course);
        
        // Загружаем уроки из курса через API
        this.courseService.getCourseLessons(courseId).subscribe({
          next: (courseLessonsData) => {
            console.log('📚 Загружены уроки из курса (API):', courseLessonsData);
            
            // Если API вернул данные, используем их
            if (courseLessonsData && courseLessonsData.length > 0) {
              console.log('✅ Найдено уроков в course_lessons:', courseLessonsData.length);
              this.courseLessons = courseLessonsData.map((courseLesson: any) => {
                console.log('📝 Обработка урока из course_lessons:', courseLesson);
                const lesson: Lesson = {
                  id: courseLesson.lessonId || courseLesson.id || `course-${courseId}-${courseLesson.courseLessonId || courseLesson.id}`,
                  teacherId: course.teacherId,
                  studentId: this.authService.getCurrentUser()?.id || '',
                  scheduledAt: courseLesson.scheduledAt ? new Date(courseLesson.scheduledAt) : new Date(),
                  status: courseLesson.status || 'planned',
                  teacherName: courseLesson.teacherName || course.teacherId || '',
                  tasks: [],
                  questions: [],
                  materials: [],
                  courseId: courseId,
                  courseTitle: course.title,
                  section: courseLesson.section || courseLesson.sectionName,
                  subSection: courseLesson.subSection || courseLesson.subSectionName,
                  lessonName: courseLesson.lessonName || courseLesson.name,
                  plannedDurationMinutes: courseLesson.plannedDurationMinutes || null,
                  description: courseLesson.description || null,
                  isFromCourse: true
                };
                console.log('✅ Создан урок для отображения:', lesson);
                return lesson;
              });
            } else {
              console.log('⚠️ API не вернул данные, используем структуру курса');
              // Если API не вернул данные, извлекаем уроки из структуры курса
              this.extractLessonsFromCourseStructure(course, courseId);
            }

            // Загружаем задачи и вопросы для уроков из курса
            this.loadTasksAndQuestionsForCourseLessons();
            
            this.loading = false;
            console.log('📚 Уроки из курса обработаны:', this.courseLessons);
          },
          error: (error) => {
            console.warn('⚠️ Ошибка загрузки уроков из курса через API, используем структуру курса:', error);
            // Fallback: извлекаем уроки из структуры курса
            this.extractLessonsFromCourseStructure(course, courseId);
            this.loading = false;
          }
        });
      },
      error: (error) => {
        console.error('Ошибка загрузки курса:', error);
        this.loading = false;
      }
    });
  }

  // Извлечение уроков из структуры курса (fallback)
  extractLessonsFromCourseStructure(course: Course, courseId: number): void {
    this.courseLessons = [];
    console.log('📚 Извлечение уроков из структуры курса:', { courseId, course });
    
    // Обрабатываем уроки на уровне секций
    if (course.lessons) {
      Object.keys(course.lessons).forEach(section => {
        course.lessons![section].forEach(lessonObj => {
          if (lessonObj.type === 'call') {
            console.log('📝 Найден call lesson в секции:', { section, lesson: lessonObj });
            const lesson: Lesson = {
              id: `course-${courseId}-${section}-${lessonObj.name}`,
              teacherId: course.teacherId,
              studentId: this.authService.getCurrentUser()?.id || '',
              scheduledAt: new Date(), // По умолчанию текущая дата
              status: 'planned',
              teacherName: '',
              tasks: [],
              questions: [],
              materials: [],
              courseId: courseId,
              courseTitle: course.title,
              section: section,
              subSection: undefined,
              lessonName: lessonObj.name,
              plannedDurationMinutes: (lessonObj as any).plannedDurationMinutes || null,
              description: lessonObj.description || null,
              isFromCourse: true
            };
            this.courseLessons.push(lesson);
            console.log('✅ Добавлен урок из секции:', lesson);
          }
        });
      });
    }
    
    // Обрабатываем уроки в подсекциях
    if (course.lessonsInSubSections) {
      Object.keys(course.lessonsInSubSections).forEach(section => {
        Object.keys(course.lessonsInSubSections![section]).forEach(subSection => {
          course.lessonsInSubSections![section][subSection].forEach(lessonObj => {
            if (lessonObj.type === 'call') {
              console.log('📝 Найден call lesson в подсекции:', { section, subSection, lesson: lessonObj });
              const lesson: Lesson = {
                id: `course-${courseId}-${section}-${subSection}-${lessonObj.name}`,
                teacherId: course.teacherId,
                studentId: this.authService.getCurrentUser()?.id || '',
                scheduledAt: new Date(), // По умолчанию текущая дата
                status: 'planned',
                teacherName: '',
                tasks: [],
                questions: [],
                materials: [],
                courseId: courseId,
                courseTitle: course.title,
                section: section,
                subSection: subSection,
                lessonName: lessonObj.name,
                plannedDurationMinutes: (lessonObj as any).plannedDurationMinutes || null,
                description: lessonObj.description || null,
                isFromCourse: true
              };
              this.courseLessons.push(lesson);
              console.log('✅ Добавлен урок из подсекции:', lesson);
            }
          });
        });
      });
    }
    
    console.log('📚 Всего уроков извлечено из структуры курса:', this.courseLessons.length);
  }

  // Загрузка задач и вопросов для уроков из курса
  loadTasksAndQuestionsForCourseLessons(): void {
    if (this.courseLessons.length === 0) {
      return;
    }

    const loadPromises = this.courseLessons.map(lesson => {
      if (!lesson.id || lesson.id.startsWith('course-')) {
        // Для уроков из курса без реального lessonId пропускаем загрузку
        return Promise.resolve();
      }
      
      return Promise.all([
        this.lessonService.getTasksForLesson(lesson.id).toPromise().catch(() => []),
        this.lessonService.getQuestionsForLesson(lesson.id).toPromise().catch(() => []),
        this.getMaterialsForLesson(lesson.id).catch(() => [])
      ]).then(([tasks, questions, materials]) => {
        lesson.tasks = (tasks || []) as Task[];
        lesson.questions = (questions || []) as Question[];
        lesson.materials = materials || [];
      });
    });

    Promise.all(loadPromises).then(() => {
      console.log('📚 Задачи, вопросы и материалы загружены для уроков из курса');
    }).catch(error => {
      console.error('Ошибка загрузки задач, вопросов и материалов для уроков из курса:', error);
    });
  }

  // Обработка выбора курса
  onCourseSelected(courseId: number | null): void {
    console.log('📚 Выбран курс:', courseId);
    this.selectedCourse = courseId;
    if (courseId) {
      this.loadCourseLessons(courseId);
    } else {
      console.log('📚 Курс не выбран, очищаем список уроков курса');
      this.courseLessons = [];
    }
    this.currentPage = 1; // Сброс на первую страницу
  }

  // Загрузка уроков студента
  loadStudentLessons(): void {
    const studentId = this.authService.getCurrentUser()?.id;
    if (!studentId) return;

    this.loading = true;
    this.lessonService.getStudentSentRequests(studentId).subscribe({
      next: (requests) => {
        console.log('📚 Загружены все заявки студента:', requests);
        
        // Преобразуем заявки в формат уроков
        this.lessons = requests.map(request => {
          const requestData = request as {
            lessonId?: string,
            id?: string,
            teacherId?: string,
            scheduledAt?: string,
            status?: string,
            teacherName?: string
          };
          return {
            id: requestData.lessonId || requestData.id || '',
            teacherId: requestData.teacherId || '',
            studentId: studentId,
            scheduledAt: new Date(requestData.scheduledAt || new Date()),
            status: requestData.status || '',
            teacherName: requestData.teacherName || '',
            tasks: [],
            questions: [],
            materials: []
          };
        }) as Lesson[];
        
        this.updateLessonStatuses();
        
        // Загружаем задачи и вопросы для всех уроков
        this.loadTasksAndQuestionsForAllLessons();
        
        console.log('📚 Уроки обработаны:', this.lessons);
      },
      error: (error) => {
        console.error('Ошибка загрузки уроков:', error);
        this.loading = false;
      }
    });
  }

  // Загрузка домашних заданий для урока
  loadHomeworkItems(lessonId: string): void {
    console.log('📋 Начинаем загрузку домашних заданий для урока:', lessonId);
    
    // Загружаем домашние задания из БД через HomeworkService
    this.homeworkService.getHomeworkForLesson(lessonId).subscribe({
      next: (homeworkFromDB) => {
        console.log('📋 Домашние задания загружены из БД:', homeworkFromDB);
        
        // Преобразуем в формат для отображения
        const homeworkItems = homeworkFromDB.map(homework => ({
          id: homework.id,
          type: homework.sourceType,
          title: homework.title,
          description: homework.description,
          dueDate: homework.dueDate,
          status: homework.status === 'assigned' ? 'unfinished' : homework.status,
          itemId: homework.sourceItemId,
          createdAt: homework.assignedAt,
          lessonId: homework.lessonId,
          createdInClass: homework.createdInClass,
          sourceItemText: homework.sourceItemText,
          grade: homework.grade,
          teacherFeedback: homework.teacherFeedback
        }));
        
        // Загружаем также из localStorage для совместимости со старыми данными
        const savedHomework = localStorage.getItem(`homework_${lessonId}`);
        let localHomework: HomeworkItem[] = [];
        if (savedHomework) {
          localHomework = JSON.parse(savedHomework);
          console.log('📋 Домашние задания загружены из localStorage:', localHomework);
        }
        
        // Объединяем данные из БД и localStorage, избегая дублирования
        const combinedHomework = [...homeworkItems];
        
        // Добавляем домашние задания из localStorage которых нет в БД
        localHomework.forEach(localItem => {
          const existsInDB = homeworkItems.some(dbItem => 
            (dbItem as {itemId?: string}).itemId === (localItem as {itemId?: string}).itemId && 
            dbItem.title === localItem.title
          );
          
          if (!existsInDB) {
            // Добавляем поле createdInClass для совместимости
            const localItemTyped = localItem as {createdInClass?: boolean};
            localItemTyped.createdInClass = localItemTyped.createdInClass !== undefined ? localItemTyped.createdInClass : true;
            const homeworkItem = {
              id: (localItem as {id?: string}).id || '',
              type: (localItem as {type?: string}).type || undefined,
              title: (localItem as {title?: string}).title || '',
              description: (localItem as {description?: string}).description || '',
              dueDate: (localItem as {dueDate?: Date}).dueDate || new Date(),
              status: ((localItem as {status?: string}).status as 'completed' | 'submitted' | 'overdue' | 'unfinished' | 'finished') || 'unfinished',
              itemId: (localItem as {itemId?: string}).itemId || undefined,
              teacherFeedback: (localItem as {teacherFeedback?: string}).teacherFeedback || undefined,
              createdInClass: localItemTyped.createdInClass || true,
              lessonId: (localItem as {lessonId?: string}).lessonId || '',
              createdBy: (localItem as {createdBy?: string}).createdBy || '',
              createdAt: (localItem as {createdAt?: Date}).createdAt || new Date(),
              updatedAt: (localItem as {updatedAt?: Date}).updatedAt || undefined,
              sourceItemText: (localItem as {sourceItemText?: string}).sourceItemText || undefined,
              grade: (localItem as {grade?: string | number}).grade ? Number((localItem as {grade?: string | number}).grade) : undefined
            };
            combinedHomework.push(homeworkItem);
          }
        });
        
        this.homeworkItems = combinedHomework;
        console.log('📋 Итоговые домашние задания для урока:', lessonId, this.homeworkItems);
      },
      error: (error) => {
        console.warn('⚠️ Ошибка загрузки домашних заданий из БД, используем localStorage:', error);
        
        // Fallback: загружаем только из localStorage
        const savedHomework = localStorage.getItem(`homework_${lessonId}`);
        if (savedHomework) {
          this.homeworkItems = JSON.parse(savedHomework);
          // Добавляем поле createdInClass для совместимости
          this.homeworkItems.forEach(item => {
            const itemTyped = item as {createdInClass?: boolean};
            if (itemTyped['createdInClass'] === undefined) {
              itemTyped['createdInClass'] = true; // по умолчанию считаем что создано в классе
            }
          });
          console.log('📋 Домашние задания загружены из localStorage (fallback):', this.homeworkItems);
        } else {
          this.homeworkItems = [];
        }
      }
    });
  }

  // Загрузка конспекта урока
  async loadLessonNotes(lessonId: string): Promise<void> {
    try {
      console.log('📝 Загрузка конспекта для урока из базы данных:', lessonId);
      
      // Инициализируем заметки из базы данных
      await this.lessonNotesService.initNotesForLesson(lessonId);
      
      // Подписываемся на заметки
      this.lessonNotesService.notes$.subscribe(notesData => {
        if (notesData && notesData.lessonId === lessonId) {
          console.log('📝 Загружен конспект для урока из базы данных:', lessonId, notesData);
          
          // Преобразуем данные из LessonNotesService в формат, ожидаемый HTML
          this.lessonNotes = {
            tasksNotes: this.extractStructuredNotes(notesData.tasks || []),
            questionsNotes: this.extractStructuredNotes(notesData.questions || []),
            materialsNotes: this.extractStructuredNotes(notesData.materials || []),
            // Сохраняем старый формат для совместимости
            tasksContent: this.extractNotesContent(notesData.tasks || []),
            questionsContent: this.extractNotesContent(notesData.questions || []),
            materialsContent: this.extractNotesContent(notesData.materials || [])
          };
          
          console.log('📝 Конспект преобразован для отображения:', this.lessonNotes);
        }
      });
      
    } catch (error) {
      console.error('❌ Ошибка загрузки конспекта из базы данных:', error);
      this.lessonNotes = null;
      console.log('📝 Конспект не найден для урока:', lessonId);
    }
  }

  // Извлекает содержимое заметок и объединяет их
  private extractNotesContent(notes: LessonNote[]): string {
    if (!notes || notes.length === 0) {
      return '';
    }
    
    return notes.map(note => {
      if (note.content && note.content.trim()) {
        return `${note.itemText}:\n${note.content}`;
      }
      return '';
    }).filter(content => content.length > 0).join('\n\n');
  }

  // Новый метод для структурированных заметок
  private extractStructuredNotes(notes: LessonNote[]): unknown[] {
    if (!notes || notes.length === 0) {
      return [];
    }
    
    return notes.filter(note => note.content && note.content.trim()).map(note => ({
      itemText: note.itemText,
      content: note.content.trim(),
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    }));
  }

  // Проверка, есть ли домашние задания для урока
  hasHomeworkItems(lessonId: string): boolean {
    const savedHomework = localStorage.getItem(`homework_${lessonId}`);
    return !!(savedHomework && JSON.parse(savedHomework).length > 0);
  }

  // Проверка, есть ли конспект для урока
  hasLessonNotes(lessonId: string): boolean {
    // Проверяем в текущих заметках из сервиса
    const currentNotes = this.lessonNotesService.exportNotes();
    if (currentNotes && currentNotes.lessonId === lessonId) {
      // Проверяем, есть ли хотя бы одна заметка с содержимым
      const hasTasks = currentNotes.tasks && currentNotes.tasks.some(note => note.content && note.content.trim());
      const hasQuestions = currentNotes.questions && currentNotes.questions.some(note => note.content && note.content.trim());
      const hasMaterials = currentNotes.materials && currentNotes.materials.some(note => note.content && note.content.trim());
      
      return hasTasks || hasQuestions || hasMaterials;
    }
    
    // Fallback к localStorage для совместимости
    const savedNotes = localStorage.getItem(`lesson_notes_${lessonId}`);
    if (!savedNotes) return false;
    
    try {
      const notesData: LessonNotesData = JSON.parse(savedNotes);
      
      // Проверяем, есть ли хотя бы одна заметка с содержимым
      const hasTasks = notesData.tasks && notesData.tasks.some(note => note.content && note.content.trim());
      const hasQuestions = notesData.questions && notesData.questions.some(note => note.content && note.content.trim());
      const hasMaterials = notesData.materials && notesData.materials.some(note => note.content && note.content.trim());
      
      return hasTasks || hasQuestions || hasMaterials;
    } catch (error) {
      console.error('Ошибка при проверке конспекта:', error);
      return false;
    }
  }

  // Проверка наличия заметок для конкретного раздела
  hasNotesForSection(section: 'tasks' | 'questions' | 'materials'): boolean {
    if (!this.lessonNotes) return false;
    
    const sectionNotes = (this.lessonNotes as {[key: string]: unknown})[`${section}Notes`];
    return Boolean(sectionNotes && (sectionNotes as {length?: number})?.length && (sectionNotes as {length?: number}).length! > 0);
  }

  // Загрузка конкретного урока с задачами и вопросами
  loadLesson(lessonId: string): void {
    this.loading = true;
    
    // Загружаем урок
    this.lessonService.getLessonDetails(lessonId).subscribe({
      next: (lesson) => {
        this.currentLesson = lesson as unknown as Lesson;
        this.highlightedLessonId = lessonId;
        
        // Загружаем задачи и вопросы
        this.loadTasksAndQuestions(lessonId);
        
        // Загружаем домашние задания и конспекты
        this.loadHomeworkItems(lessonId);
        this.loadLessonNotes(lessonId);
        
        setTimeout(() => {
          this.highlightedLessonId = null;
        }, 5000);
      },
      error: (error) => {
        console.error('Ошибка загрузки урока:', error);
        this.loading = false;
      }
    });
  }

  // Загрузка задач, вопросов и материалов для урока
  loadTasksAndQuestions(lessonId: string): void {
    Promise.all([
      this.lessonService.getTasksForLesson(lessonId).toPromise(),
      this.lessonService.getQuestionsForLesson(lessonId).toPromise(),
      this.getMaterialsForLesson(lessonId)
    ]).then(([tasks, questions, materials]) => {
      if (this.currentLesson) {
        this.currentLesson.tasks = (tasks || []) as Task[];
        this.currentLesson.questions = (questions || []) as Question[];
        this.currentLesson.materials = materials || [];
      }
      this.loading = false;
    }).catch(error => {
      console.error('Ошибка загрузки задач, вопросов и материалов:', error);
      this.loading = false;
    });
  }

  // Получение материалов для урока
  private async getMaterialsForLesson(lessonId: string): Promise<Material[]> {
    try {
      console.log('🔍 Загружаем материалы для урока:', lessonId);
      const allMaterials = await this.materialService.getMaterials().toPromise();
      console.log('📦 Все материалы получены:', allMaterials);
      
      if (!allMaterials || allMaterials.length === 0) {
        console.warn('⚠️ Материалы не найдены или список пуст. Возможно file-service не запущен?');
        return [];
      }
      
      const filteredMaterials = allMaterials.filter(material => {
        const isAttached = material.attachedLessons && material.attachedLessons.includes(lessonId);
        //console.log(`📎 Материал "${material.title}" прикреплен к урокам:`, material.attachedLessons, 'включает урок', lessonId, '?', isAttached);
        return isAttached;
      });
      
      console.log('✅ Отфильтрованные материалы для урока:', filteredMaterials);
      return filteredMaterials;
    } catch (error) {
      console.error('❌ Ошибка загрузки материалов для урока:', error);
      console.error('❌ Возможные причины:');
      console.error('   1. File-service не запущен на порту 3008');
      console.error('   2. Проблемы с подключением к API');
      console.error('   3. Ошибка в структуре данных материалов');
      return [];
    }
  }

  // Перезагрузка материалов для текущего урока
  async reloadMaterialsForCurrentLesson(): Promise<void> {
    if (!this.currentLesson) return;
    
    try {
      const materials = await this.getMaterialsForLesson(this.currentLesson.id);
      this.currentLesson.materials = materials;
      
      // Обновляем материалы и в списке уроков
      const lessonInList = this.lessons.find(l => l.id === this.currentLesson!.id);
      if (lessonInList) {
        lessonInList.materials = materials;
      }
      
      console.log('✅ Материалы урока перезагружены:', materials);
    } catch (error) {
      console.error('❌ Ошибка перезагрузки материалов:', error);
    }
  }

  // Загрузка задач, вопросов и материалов для всех уроков
  loadTasksAndQuestionsForAllLessons(): void {
    if (this.lessons.length === 0) {
      this.loading = false;
      return;
    }

    const loadPromises = this.lessons.map(lesson => 
      Promise.all([
        this.lessonService.getTasksForLesson(lesson.id).toPromise().catch(() => []),
        this.lessonService.getQuestionsForLesson(lesson.id).toPromise().catch(() => []),
        this.getMaterialsForLesson(lesson.id).catch(() => [])
      ]).then(([tasks, questions, materials]) => {
        lesson.tasks = (tasks || []) as Task[];
        lesson.questions = (questions || []) as Question[];
        lesson.materials = materials || [];
      })
    );

    Promise.all(loadPromises).then(() => {
      this.loading = false;
      console.log('📚 Задачи, вопросы и материалы загружены для всех уроков');
    }).catch(error => {
      console.error('Ошибка загрузки задач, вопросов и материалов для уроков:', error);
      this.loading = false;
    });
  }

  // Обновление статусов уроков (прошедшие/будущие)
  updateLessonStatuses(): void {
    // Сохраняем оригинальные статусы из API, не изменяем их
    // Фильтрация будет основана на дате и статусе в методе matchesCurrentFilter
    console.log('📊 Статусы уроков сохранены:', this.lessons.map(l => ({id: l.id, status: l.status, date: l.scheduledAt})));
  }

  // Добавление новой задачи
  addTask(): void {
    if (!this.newTaskTitle.trim() || !this.currentLesson) return;

    const studentId = this.authService.getCurrentUser()?.id;
    if (!studentId) return;

    const taskData = {
      lessonId: this.currentLesson.id,
      title: this.newTaskTitle,
      description: this.newTaskDescription || null,
      createdBy: studentId,
      createdByRole: 'student' as const
    };

    this.lessonService.addTaskToLesson(taskData).subscribe({
      next: (newTask) => {
        if (this.currentLesson) {
          this.currentLesson.tasks.push(newTask as unknown as Task);
          
          // Обновляем задачи и в списке уроков
          const lessonInList = this.lessons.find(l => l.id === this.currentLesson!.id);
          if (lessonInList) {
            lessonInList.tasks.push(newTask as unknown as Task);
          }
        }
        this.clearTaskForm();
        console.log('Задача добавлена:', newTask);
      },
      error: (error) => {
        console.error('Ошибка добавления задачи:', error);
      }
    });
  }

  // Добавление нового вопроса
  addQuestion(): void {
    if (!this.newQuestionText.trim() || !this.currentLesson) return;

    const studentId = this.authService.getCurrentUser()?.id;
    if (!studentId) return;

    const questionData = {
      lessonId: this.currentLesson.id,
      question: this.newQuestionText,
      createdBy: studentId,
      createdByRole: 'student' as const
    };

    this.lessonService.addQuestionToLesson(questionData).subscribe({
      next: (newQuestion) => {
        if (this.currentLesson) {
          this.currentLesson.questions.push(newQuestion as unknown as Question);
          
          // Обновляем вопросы и в списке уроков
          const lessonInList = this.lessons.find(l => l.id === this.currentLesson!.id);
          if (lessonInList) {
            lessonInList.questions.push(newQuestion as unknown as Question);
          }
        }
        this.clearQuestionForm();
        console.log('Вопрос добавлен:', newQuestion);
      },
      error: (error) => {
        console.error('Ошибка добавления вопроса:', error);
      }
    });
  }

  // Очистка формы задачи
  clearTaskForm(): void {
    this.newTaskTitle = '';
    this.newTaskDescription = '';
    this.showAddTaskForm = false;
  }

  // Очистка формы вопроса
  clearQuestionForm(): void {
    this.newQuestionText = '';
    this.showAddQuestionForm = false;
  }



  // Геттеры для совместимости с шаблоном
  get filteredLessons() {
    if (this.currentLesson) {
      // Когда выбран конкретный урок через calendar, показываем его первым, затем остальные
      const allLessons = this.getAllLessons();
      const otherLessons = allLessons.filter(lesson => 
        lesson.id !== this.currentLesson!.id && this.matchesCurrentFilter(lesson)
      );
      return [this.currentLesson, ...otherLessons];
    }
    
    // Когда заходим на вкладку напрямую, применяем пагинацию
    const allFiltered = this.fullFilteredLessons;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return allFiltered.slice(startIndex, endIndex);
  }

  // Получить все уроки (обычные + из курса)
  getAllLessons(): Lesson[] {
    if (this.selectedCourse) {
      // Если выбран курс, показываем только уроки из этого курса
      console.log('📚 Выбран курс, показываем уроки из курса:', this.courseLessons.length);
      return this.courseLessons;
    }
    // Иначе показываем обычные уроки
    console.log('📚 Курс не выбран, показываем обычные уроки:', this.lessons.length);
    return this.lessons;
  }

  get fullFilteredLessons() {
    // Получаем все уроки (обычные или из курса)
    const allLessons = this.getAllLessons();
    
    const result = allLessons.filter(lesson => this.matchesCurrentFilter(lesson));
    
    // Если есть выделенный урок (через calendar), ставим его первым
    if (this.highlightedLessonIdFromUrl) {
      const highlightedLesson = result.find(l => l.id === this.highlightedLessonIdFromUrl);
      const otherLessons = result.filter(l => l.id !== this.highlightedLessonIdFromUrl);
      
      if (highlightedLesson) {
        return [highlightedLesson, ...otherLessons];
      }
    }

    // Сортируем по дате: предстоящие по возрастанию, прошедшие по убыванию
    const sorted = result.sort((a, b) => {
      const dateA = new Date(a.scheduledAt);
      const dateB = new Date(b.scheduledAt);
      const now = new Date();
      
      const aIsFuture = dateA > now;
      const bIsFuture = dateB > now;
      
      if (aIsFuture && bIsFuture) {
        return dateA.getTime() - dateB.getTime(); // Предстоящие: ближайшие первыми
      } else if (!aIsFuture && !bIsFuture) {
        return dateB.getTime() - dateA.getTime(); // Прошедшие: последние первыми
      } else {
        return aIsFuture ? -1 : 1; // Предстоящие перед прошедшими
      }
    });
    
    return sorted;
  }

  private matchesCurrentFilter(lesson: Lesson): boolean {
    const now = new Date();
    const lessonDate = new Date(lesson.scheduledAt);
    
    // Фильтр по времени
    if (this.filter === 'future') {
      // À venir: ТОЛЬКО предстоящие уроки по времени
      const isFutureTime = lessonDate > now;
      
      // console.log(`🔍 Фильтр Future для урока ${lesson.id}:`, {
      //   lessonDate: lessonDate.toISOString(),
      //   now: now.toISOString(), 
      //   status: lesson.status,
      //   isFutureTime,
      //   teacherName: lesson.teacherName
      // });
      
      if (!isFutureTime) return false;
    } else if (this.filter === 'past') {
      // Passés: ТОЛЬКО прошедшие по времени
      const isPastTime = lessonDate <= now;
      
      // console.log(`🕐 Фильтр Past для урока ${lesson.id}:`, {
      //   lessonDate: lessonDate.toISOString(),
      //   now: now.toISOString(),
      //   status: lesson.status,
      //   isPastTime,
      //   teacherName: lesson.teacherName
      // });
      
      if (!isPastTime) return false;
    }
    // 'all' - показываем все (предстоящие, прошедшие, отмененные, ожидающие подтверждения)

    // Фильтр по преподавателю
    if (this.selectedTeacher && lesson.teacherName !== this.selectedTeacher) {
      return false;
    }

    // Фильтр по дате начала
    if (this.startDate) {
      const filterDate = new Date(this.startDate);
      if (lessonDate < filterDate) return false;
    }

    // Фильтр по дате окончания
    if (this.endDate) {
      const filterDate = new Date(this.endDate);
      filterDate.setHours(23, 59, 59, 999); // Конец дня
      if (lessonDate > filterDate) return false;
    }

    // Фильтр по поисковому запросу
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      const hasMatchInTasks = lesson.tasks.some(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower)
      );
      const hasMatchInQuestions = lesson.questions.some(question =>
        question.question.toLowerCase().includes(searchLower)
      );
      
      if (!hasMatchInTasks && !hasMatchInQuestions) return false;
    }

    return true;
  }

  get uniqueTeachers(): string[] {
    const allLessons = this.getAllLessons();
    const teachers = allLessons
      .map(lesson => lesson.teacherName)
      .filter((name, index, arr) => name && arr.indexOf(name) === index);
    return teachers as string[];
  }

  get allHomework(): string[] {
    return [];
  }

  get stats() {
    const now = new Date();
    return {
      pastCount: this.lessons.filter(l => {
        const lessonDate = new Date(l.scheduledAt);
        return lessonDate <= now || ['completed', 'past'].includes(l.status);
      }).length,
      futureCount: this.lessons.filter(l => {
        const lessonDate = new Date(l.scheduledAt);
        return lessonDate > now || ['confirmed', 'pending', 'in_progress'].includes(l.status);
      }).length,
      totalTasks: this.lessons.reduce((acc, l) => acc + l.tasks.length, 0),
      totalQuestions: this.lessons.reduce((acc, l) => acc + l.questions.length, 0),
    };
  }

  // Методы для отображения статуса
  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'En attente',
      'confirmed': 'Confirmé',
      'rejected': 'Rejeté',
      'cancelled_by_student': 'Annulé par l\'étudiant',
      'cancelled_by_student_no_refund': 'Annulé (pas de remboursement)',
      'in_progress': 'En cours',
      'completed': 'Terminé',
      'future': 'À venir',
      'past': 'Passé'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'pending': 'status-pending',
      'confirmed': 'status-confirmed',
      'rejected': 'status-rejected',
      'cancelled_by_student': 'status-cancelled',
      'cancelled_by_student_no_refund': 'status-cancelled',
      'in_progress': 'status-in-progress',
      'completed': 'status-completed',
      'future': 'status-future',
      'past': 'status-past'
    };
    return classMap[status] || 'status-default';
  }

  // Возврат к списку уроков
  backToLessonList(): void {
    this.currentLesson = null;
    this.highlightedLessonId = null;
    this.highlightedLessonIdFromUrl = null;
    
    // Обновляем URL, убирая параметры урока
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
    
    // Загружаем список уроков если он пустой
    if (this.lessons.length === 0) {
      this.loadStudentLessons();
    }
  }

  // Методы-заглушки для совместимости
  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex + 1;
  }

  addToHomework(item: unknown) {
    // Реализовать при nécessité
  }

  // Проверка можно ли войти в класс (только для confirmed уроков в тот же день)
  canEnterClass(lesson: Lesson): boolean {
    // Проверяем статус - можно войти только в confirmed уроки (одобренные преподавателем)
    if (lesson.status !== 'confirmed') {
      return false;
    }

    const now = new Date();
    const lessonTime = new Date(lesson.scheduledAt);
    
    // Проверяем что урок в тот же день
    const isSameDay = now.getFullYear() === lessonTime.getFullYear() &&
                      now.getMonth() === lessonTime.getMonth() &&
                      now.getDate() === lessonTime.getDate();
    
    return isSameDay;
  }

  // Вход в виртуальный класс
  async enterVirtualClass(lesson: Lesson): Promise<void> {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (!currentUserId) return;

    // Устанавливаем данные урока в VideoCallService
    this.videoCallService.setLessonData(lesson.id, currentUserId);
    
    // ВСЕГДА ПЕРЕЗАГРУЖАЕМ МАТЕРИАЛЫ ПЕРЕД ВХОДОМ В КЛАСС
    console.log('🔄 Перезагружаем материалы перед входом в класс');
    const freshMaterials = await this.getMaterialsForLesson(lesson.id);
    
    // Обновляем материалы в уроке
    lesson.materials = freshMaterials;
    
    // Также обновляем материалы в списке уроков
    const lessonInList = this.lessons.find(l => l.id === lesson.id);
    if (lessonInList) {
      lessonInList.materials = freshMaterials;
    }
    
    // ПЕРЕДАЕМ РЕАЛЬНЫЕ ДАННЫЕ УРОКА В LESSON-MATERIAL КОМПОНЕНТ
    const studentTasks = lesson.tasks.filter(t => t.createdByRole === 'student').map(t => ({ id: t.id, title: t.title }));
    const teacherTasks = lesson.tasks.filter(t => t.createdByRole === 'teacher').map(t => ({ id: t.id, title: t.title }));
    const studentQuestions = lesson.questions.filter(q => q.createdByRole === 'student').map(q => ({ id: q.id, question: q.question }));
    const teacherQuestions = lesson.questions.filter(q => q.createdByRole === 'teacher').map(q => ({ id: q.id, question: q.question }));
    
    this.lessonTabsService.setCurrentLessonData({
      id: lesson.id,
      date: lesson.scheduledAt,
      teacherTasks: teacherTasks,
      studentTasks: studentTasks,
      studentQuestions: studentQuestions,
      teacherQuestions: teacherQuestions,
      materials: freshMaterials,
      texts: freshMaterials.filter(m => m.type === 'text'),
      audios: freshMaterials.filter(m => m.type === 'audio'),
      videos: freshMaterials.filter(m => m.type === 'video'),
      homework: []
    });
    
    console.log('✅ Реальные данные урока переданы в classroom:', {
      studentTasks,
      teacherTasks,
      studentQuestions,
      teacherQuestions,
      materials: freshMaterials.length
    });
    
    this.router.navigate([`/classroom/${lesson.id}/lesson`], {
      queryParams: { startCall: true }
    });
  }

  recalculateStatus() {
    this.updateLessonStatuses();
    this.currentPage = 1; // Сброс на первую страницу при смене фильтра
  }

  // ==================== МЕТОДЫ ДЛЯ ОТОБРАЖЕНИЯ АВТОРСТВА ====================
  
  getTaskAuthorDisplay(task: Task): string {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (task.createdBy === currentUserId) {
      return 'Mes tâches';
    } else {
      // Если задача создана преподавателем, показываем имя преподавателя
      return this.currentLesson?.teacherName || 'Professeur';
    }
  }

  getQuestionAuthorDisplay(question: Question): string {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (question.createdBy === currentUserId) {
      return 'Mes questions';
    } else {
      // Если вопрос создан преподавателем, показываем имя преподавателя
      return this.currentLesson?.teacherName || 'Professeur';
    }
  }

  getMaterialAuthorDisplay(material: Material): string {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (material.createdBy === currentUserId) {
      return 'Mes matériaux';
    } else {
      // Если материал создан преподавателем, показываем имя преподавателя
      return material.createdByName || 'Professeur';
    }
  }

  isOwnContent(createdBy: string): boolean {
    const currentUserId = this.authService.getCurrentUser()?.id;
    return createdBy === currentUserId;
  }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С СТАТУСОМ ПРОРАБОТКИ ====================
  
  // Проверка проработан ли элемент (есть ли для него заметки)
  isItemProcessed(section: 'tasks' | 'questions' | 'materials', itemIdentifier: string): boolean {
    // Для задач и вопросов используем содержимое как идентификатор (совместимость с lesson-material)
    // Для материалов используем ID
    let itemId: string;
    if (section === 'tasks') {
      // Ищем задачу по содержимому (title)
      const task = this.currentLesson?.tasks.find(t => t.title === itemIdentifier);
      itemId = task ? task.title : itemIdentifier; // Используем title как itemId для совместимости
    } else if (section === 'questions') {
      // Ищем вопрос по содержимому
      const question = this.currentLesson?.questions.find(q => q.question === itemIdentifier);
      itemId = question ? question.question : itemIdentifier; // Используем question как itemId для совместимости
    } else {
      itemId = itemIdentifier; // Для материалов используем ID
    }
    
    const note = this.lessonNotesService.getNoteForItem(section, itemId);
    return note !== undefined && note.content.trim().length > 0;
  }

  // Получение заметки для элемента
  getNoteForItem(section: 'tasks' | 'questions' | 'materials', itemIdentifier: string): unknown {
    // Аналогично с isItemProcessed
    let itemId: string;
    if (section === 'tasks') {
      const task = this.currentLesson?.tasks.find(t => t.title === itemIdentifier);
      itemId = task ? task.title : itemIdentifier;
    } else if (section === 'questions') {
      const question = this.currentLesson?.questions.find(q => q.question === itemIdentifier);
      itemId = question ? question.question : itemIdentifier;
    } else {
      itemId = itemIdentifier;
    }
    
    return this.lessonNotesService.getNoteForItem(section, itemId);
  }

  // Получение статуса проработки в текстовом виде
  getProcessingStatusText(section: 'tasks' | 'questions' | 'materials', itemId: string): string {
    return this.isItemProcessed(section, itemId) ? 'Travaillé' : 'Non travaillé';
  }

  // Получение CSS класса для статуса проработки
  getProcessingStatusClass(section: 'tasks' | 'questions' | 'materials', itemId: string): string {
    return this.isItemProcessed(section, itemId) ? 'status-processed' : 'status-unprocessed';
  }

  // ==================== УПРАВЛЕНИЕ РАСКРЫВАЮЩИМИСЯ ПАНЕЛЯМИ ====================
  
  // Переключение состояния панели задач
  toggleTaskExpansion(taskId: string): void {
    if (this.expandedTasks.has(taskId)) {
      this.expandedTasks.delete(taskId);
    } else {
      this.expandedTasks.add(taskId);
    }
  }

  // Переключение состояния панели вопросов
  toggleQuestionExpansion(questionId: string): void {
    if (this.expandedQuestions.has(questionId)) {
      this.expandedQuestions.delete(questionId);
    } else {
      this.expandedQuestions.add(questionId);
    }
  }

  // Переключение состояния панели материалов
  toggleMaterialExpansion(materialId: string): void {
    if (this.expandedMaterials.has(materialId)) {
      this.expandedMaterials.delete(materialId);
    } else {
      this.expandedMaterials.add(materialId);
    }
  }

  // Проверка раскрыта ли панель задач
  isTaskExpanded(taskId: string): boolean {
    return this.expandedTasks.has(taskId);
  }

  // Проверка раскрыта ли панель вопросов
  isQuestionExpanded(questionId: string): boolean {
    return this.expandedQuestions.has(questionId);
  }

  // Проверка раскрыта ли панель материалов
  isMaterialExpanded(materialId: string): boolean {
    return this.expandedMaterials.has(materialId);
  }

  // Helper метод для форматирования дат homework в шаблоне
  formatHomeworkDate(date: unknown): string {
    if (!date) return '';
    try {
      return new Date(date as string | Date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  }

  // Helper методы для lessonNotes (такие же как в teacher-lesson-management)
  getNotesCount(section: string): number {
    const notes = (this.lessonNotes as {[key: string]: unknown})?.[`${section}Notes`];
    return (notes as {length?: number})?.length || 0;
  }

  getNotesForSection(section: string): unknown[] {
    const notes = (this.lessonNotes as {[key: string]: unknown})?.[`${section}Notes`];
    return (notes as unknown[]) || [];
  }

  // Helper методы для note properties
  getNoteItemText(note: unknown): string {
    return (note as {itemText?: string})?.itemText || '';
  }

  getNoteFormattedDate(note: unknown): string {
    const updatedAt = (note as {updatedAt?: Date | string})?.updatedAt;
    if (!updatedAt) return '';
    
    try {
      return new Date(updatedAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  }

  getNoteContentText(note: unknown): string {
    return (note as {content?: string})?.content || '';
  }

  // Helper методы для task, question, material properties
  getTaskTitle(task: unknown): string {
    return (task as {title?: string})?.title || '';
  }

  getQuestionText(question: unknown): string {
    return (question as {question?: string})?.question || '';
  }

  getMaterialId(material: unknown): string {
    return String((material as {id?: string | number})?.id || '');
  }

  // Helper методы для getNoteContent и getNoteUpdatedAt (аналогично teacher-lesson-management)
  getNoteContent(section: 'tasks' | 'questions' | 'materials', itemKey: string): string {
    const note = this.lessonNotesService.getNoteForItem(section, itemKey);
    return note ? (note as {content?: string}).content || '' : '';
  }

  getNoteUpdatedAt(section: 'tasks' | 'questions' | 'materials', itemKey: string): Date | null {
    const note = this.lessonNotesService.getNoteForItem(section, itemKey);
    const updatedAt = note ? (note as {updatedAt?: string | Date}).updatedAt : null;
    return updatedAt ? new Date(updatedAt) : null;
  }

  private updateSEOTags(): void {
    const pageTitle = 'Cours de Français - Gestion des Leçons | LINGUACONNECT';
    const pageDescription = 'Gérez vos cours de français en ligne. Planification, réservation et suivi des leçons avec des professeurs natifs pour la préparation DELF/DALF.';
    
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: pageDescription });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: pageDescription });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
  }

  // Функция для преобразования URL файлов на локальный сервер
  getFileUrl(url: string): string {
    if (!url) {
      return '#';
    }
    // Заменяем удаленный сервер на локальный
    if (url.includes('135.125.107.45:3011')) {
      return url.replace('http://135.125.107.45:3011', 'http://localhost:3011');
    }
    if (url.includes('localhost:3008')) {
      return url.replace('http://localhost:3008', `${API_ENDPOINTS.FILES}`);
    }
    return url;
  }
}

