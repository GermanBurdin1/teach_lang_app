import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  isHeaderExpanded = false;

  toggleExpandHeader(): void {
    this.isHeaderExpanded = !this.isHeaderExpanded;
  }

  switchToAdmin(): void {
    // Логика для переключения на роль администратора
    alert('Переключение на администратора');
  }

  switchToStudent(): void {
    // Логика для переключения на роль ученика
    alert('Переключение на ученика');
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
      position: { top: '230px', left: '10px' }, // Корректировка положения
      highlightElementId: 'sidebar' // ID элемента для подсветки
    }
  ];

  openTourModal(): void {
    this.isTourModalOpen = true;
    this.currentStep = 0;
    this.updateModalPosition();
  }

  closeTourModal(): void {
    this.isTourModalOpen = false;
    this.removeHighlight(); // Удаляем overlay при закрытии
  }

  nextStep(): void {
    this.currentStep++;
    if (this.currentStep < this.tourSteps.length) {
      this.updateModalPosition();
    } else {
      this.closeTourModal();
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
      } else {
        // Применяем позицию на втором и следующих шагах
        modalDialog.style.position = 'absolute';
        modalDialog.style.top = step.position?.top || '0px'; // Используем координаты из шага, если есть
        modalDialog.style.left = step.position?.left || '0px';
        modalDialog.style.transform = ''; // Применяем любые другие трансформации, если нужно
      }
    }

    // Подсветка выделенного элемента, если указано
    if (step.highlightElementId) {
      this.addHighlightOverlay(step.position);
    } else {
      this.removeHighlight();
    }
  }

  addHighlightOverlay(position: { top: string; left: string }): void {
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

    // Рассчитываем размеры и позицию "дырки"
    const top = parseInt(position.top.replace('px', ''), 10) - 130;
    const left = parseInt(position.left.replace('px', ''), 10);
    const width = 64; // Ширина области
    const height = 418; // Высота области

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

  removeHighlight(): void {
    const highlightOverlay = document.getElementById('highlight-overlay');
    if (highlightOverlay) {
      highlightOverlay.remove();
    }
  }

}
