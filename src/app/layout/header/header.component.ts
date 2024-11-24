import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';

@Component({
	selector: 'app-header',
	templateUrl: './header.component.html',
	styleUrl: './header.component.css'
})
export class HeaderComponent {

  isHeaderExpanded = false;

  constructor(private router: Router, private dashboardService: DashboardService) {}

	toggleExpandHeader(): void {
		this.isHeaderExpanded = !this.isHeaderExpanded;
	}

	switchToAdmin(): void {
    this.isHeaderExpanded = false; // Закрываем выпадающую область
    localStorage.setItem('isSchoolDashboard', JSON.stringify(true)); // Сохраняем выбор в localStorage
    this.router.navigate(['school/statistics']).then(() => {
      this.dashboardService.switchToSchoolDashboard(); // Обновляем состояние через сервис
    });
  }

  switchToStudent(): void {
    this.isHeaderExpanded = false; // Закрываем выпадающую область
    localStorage.setItem('isSchoolDashboard', JSON.stringify(false)); // Сохраняем выбор в localStorage
    this.router.navigate(['student/wordsTeaching']).then(() => {
      this.dashboardService.switchToStudentDashboard(); // Обновляем состояние через сервис
    });
  }


	// ajouter de l'argent
	showBalanceModal = false;
	isPaymentModalOpen = false;
	amountToTopUp: number = 0;

	openBalanceModal(): void {
		this.showBalanceModal = true;
	}

	closeBalanceModal(): void {
		this.showBalanceModal = false;
	}

	payWithCard(): void {
		this.showBalanceModal = false;
		this.isPaymentModalOpen = true;
	}

	closePaymentModal(): void {
		this.isPaymentModalOpen = false;
	}

	// демо-тур
	isTourModalOpen = false;
	currentStep = 0;
	modalPosition = 'relative';
	modalTop = '';
	modalLeft = '';

	tourSteps = [
		{
			title: 'Добро пожаловать на ProgressMe!',
			content: 'ProgressMe - это интерактивная платформа для преподавания. Здесь можно проводить онлайн-уроки вживую или создавать курсы для асинхронной работы. В этой короткой демонстрации вы познакомитесь с основными возможностями и разделами платформы.',
		},
		{
			title: 'Разделы личного кабинета',
			content: 'Здесь находятся активированные модули платформы...',
			position: { top: '250px', left: '10px' }, // Корректировка положения
			highlightElementId: 'sidebar' // ID элемента для подсветки
		},
		{
			title: 'Настройки платформы',
			content: 'В Настройках расположено редактирование личного профиля...',
			position: { top: '200px', left: '10px' }, // Позиция может быть скорректирована при необходимости
			highlightElementId: 'settings' // ID элемента для подсветки (если необходимо)
		},
		{
			title: 'Тарифы, история оплат и промокоды',
			content: 'Перейдите в этот раздел чтобы выбрать подходящий тарифный план, посмотреть историю оплат или ввести промокод.',
			position: { top: '255px', left: '10px' }, // Позиция может быть скорректирована при необходимости
			highlightElementId: 'tariffs' // ID элемента для подсветки (если необходимо)
		},
		{
			title: 'Онлайн-уроки в реальном времени',
			content: 'В этом разделе вы сможете проводить индивидуальные или групповые уроки в режиме реального времени. Приглашайте учеников и создавайте для них онлайн-классы с интерактивными учебными материалами, видесвязью, чатом и виртуальной доской. Все действия в классе будут мгновенно синхронизироваться между вами и учениками. Добавляйте уроки в расписание, чтобы ученики знали, когда будет следующий урок..',
			position: { top: '70px', left: '10px' }, // Позиция может быть скорректирована при необходимости
			highlightElementId: 'online-courses' // ID элемента для подсветки (если необходимо)
		},
		{
			title: 'Онлайн-курсы для асинхронного обучения',
			content: 'Здесь создаются и проводятся  авторские онлайн-курсы для самостоятельного обучения.Более 25 видов интерактивных заданий с автопроверкой, 5 режимов прохождения, подсчёт баллов и таблица лидеров. Участники смогут проходить курсы в удобное время, а вы сможете давать обратную связь для каждого урока и упражнения.',
			position: { top: '30px', left: '10px' },
			highlightElementId: 'online-courses'
		},
		{
			title: 'Учебные материалы',
			content: 'Здесь хранятся интерактивные учебники и готовые уроки от методистов платформы или ваших  коллег, которые вы можете использовать на занятиях. А если подходящего урока нет в каталоге, создать собственные материалы поможет конструктор уроков с 25+ шаблонами упражнений и AI-ассистентом. ',
			position: { top: '130px', left: '10px' },
			highlightElementId: 'online-courses'
		},
		{
			title: 'Подробнее о платформе',
			content: 'В нашей базе знаний вы найдёте обучающие статьи с подробными инструкциями для работы на платформе.',
			position: { top: '-200px', left: '650px' },
			highlightElementId: 'online-courses'
		},
		{
			title: 'Если понадобится помощь',
			content: 'Напишите нам в поддержку, нажав на эту иконку. Мы на связи с с 9:00 до 21:00 (GMT+3).',
			position: { top: '-200px', left: '650px' },
			highlightElementId: 'online-courses'
		}
	];

	openTourModal(): void {
		this.isTourModalOpen = true;
		this.currentStep = 0;
		this.updateModalPosition();
		this.addHighlightOverlay();
	}

	closeTourModal(): void {
		this.isTourModalOpen = false;
		this.removeHighlight(); // Удаляем overlay при закрытии
	}

	nextStep(): void {
		const modalElements = document.querySelectorAll('.modal.show.d-block, .modal.fade');
		modalElements.forEach(modal => {
			// Приведение к типу HTMLElement для доступа к свойству 'style'
			if (modal instanceof HTMLElement) {
				const currentBgColor = window.getComputedStyle(modal).backgroundColor;
				if (currentBgColor === 'rgba(0, 0, 0, 0.5)') {
					// Если уже есть, удаляем его
					modal.style.backgroundColor = 'transparent';
				}
			}
		});
		// Переход на следующий шаг
		this.currentStep++;
		if (this.currentStep < this.tourSteps.length) {
			this.updateModalPosition();
		} else {
			this.closeTourModal();
		}
	}

	previousStep(): void {
		if (this.currentStep > 0) {
			this.currentStep--;
			this.updateModalPosition();
		}
	}

	updateModalPosition(): void {
		const step = this.tourSteps[this.currentStep];

		const modalDialog = document.querySelector('.modal-dialog') as HTMLElement;
		if (modalDialog) {
			if (this.currentStep === 0) {
				// На первом шаге модалка остается по умолчанию
				modalDialog.style.position = '';
				modalDialog.style.top = '';
				modalDialog.style.left = '';
				modalDialog.style.transform = ''; // Удаляем любые трансформации

				// Не удаляем вуаль, а обновляем её положение
				this.addHighlightOverlay();
			} else {
				// Применяем позицию на втором и следующих шагах
				modalDialog.style.position = 'absolute';
				modalDialog.style.top = step.position?.top || '0px'; // Используем координаты из шага, если есть
				modalDialog.style.left = step.position?.left || '0px';
				modalDialog.style.transform = ''; // Применяем любые другие трансформации, если нужно

				// Подсветка выделенного элемента
				if (step.highlightElementId) {
					this.addHighlightOverlay(step.position);
				} else {
					this.removeHighlight();
				}
			}
		}
	}


	addHighlightOverlay(position?: { top: string; left: string }): void {
		// Удаляем существующий highlightOverlay, если он есть
		let existingHighlightOverlay = document.getElementById('highlight-overlay');
		if (existingHighlightOverlay) {
			existingHighlightOverlay.remove();
		}

		// Создаем новый highlightOverlay
		const highlightOverlay = document.createElement('div');
		highlightOverlay.id = 'highlight-overlay';
		highlightOverlay.style.position = 'fixed';
		highlightOverlay.style.top = '0';
		highlightOverlay.style.left = '0';
		highlightOverlay.style.width = '100vw';
		highlightOverlay.style.height = '100vh';
		highlightOverlay.style.background = 'rgba(0, 0, 0, 0.5)'; // Постоянный цвет фона
		highlightOverlay.style.zIndex = '1040'; // Убедитесь, что это выше других элементов
		highlightOverlay.style.pointerEvents = 'none'; // Пропускаем клики
		document.body.appendChild(highlightOverlay);

		if (position) {// Рассчитываем размеры и позицию "дырки"
			let top = parseInt(position.top.replace('px', ''), 10) - 150;
			let left = parseInt(position.left.replace('px', ''), 5);
			let width = 64; // Ширина области
			let height = 418; // Высота области

			// Изменение высоты на третьем шаге
			if (this.currentStep === 2) {
				top = parseInt(position.top.replace('px', ''), 0) + 210;
				height = 50;
			}

			if (this.currentStep === 3) {
				top = parseInt(position.top.replace('px', ''), 0) + 210;
				height = 50;
			}

			if (this.currentStep === 4) {
				top = parseInt(position.top.replace('px', ''), 0) + 145;
				height = 50;
			}

			if (this.currentStep === 5) {
				top = parseInt(position.top.replace('px', ''), 0) + 130;
				height = 50;
			}

			if (this.currentStep === 6) {
				top = parseInt(position.top.replace('px', ''), 0) + 145;
				height = 50;
			}

			if (this.currentStep === 7) {
				top = 9;
				left = 940;
				width = 140;
				height = 50;
			}

			if (this.currentStep === 8) {
				top = 700;
				left = 1300;
				width = 140;
				height = 700;
			}


			// Устанавливаем clip-path для создания "дырки"
			highlightOverlay.style.clipPath = `
				polygon(
					0 0,
					100% 0,
					100% 100%,
					0 100%,
					0 0,
					${left}px ${top}px,
					${left}px ${top + height}px,
					${left + width}px ${top + height}px,
					${left + width}px ${top}px,
					${left}px ${top}px
				)`;
		}

	}

	removeHighlight(): void {
		const highlightOverlay = document.getElementById('highlight-overlay');
		if (highlightOverlay) {
			highlightOverlay.remove();
		}
	}

}
