import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  template: `
    <div class="unauthorized-container">
      <div class="unauthorized-content">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h1>Доступ запрещен</h1>
        <p>У вас нет прав для доступа к этой странице.</p>
        <div class="actions">
          <button class="btn btn-primary" (click)="goHome()">
            <i class="fas fa-home"></i>
            Вернуться на главную
          </button>
          <button class="btn btn-secondary" (click)="goBack()">
            <i class="fas fa-arrow-left"></i>
            Назад
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f8f9fa;
      padding: 20px;
    }
    
    .unauthorized-content {
      text-align: center;
      max-width: 500px;
      background: white;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .error-icon {
      font-size: 4rem;
      color: #dc3545;
      margin-bottom: 20px;
    }
    
    h1 {
      color: #343a40;
      margin-bottom: 15px;
      font-size: 2rem;
    }
    
    p {
      color: #6c757d;
      margin-bottom: 30px;
      font-size: 1.1rem;
    }
    
    .actions {
      display: flex;
      gap: 15px;
      justify-content: center;
      flex-wrap: wrap;
    }
    
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 5px;
      font-size: 1rem;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
    }
    
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    
    .btn-primary:hover {
      background-color: #0056b3;
    }
    
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    
    .btn-secondary:hover {
      background-color: #545b62;
    }
    
    @media (max-width: 768px) {
      .unauthorized-content {
        padding: 20px;
      }
      
      .actions {
        flex-direction: column;
      }
      
      .btn {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class UnauthorizedComponent {
  constructor(private router: Router) {}

  goHome(): void {
    this.router.navigate(['/']);
  }

  goBack(): void {
    window.history.back();
  }
}













