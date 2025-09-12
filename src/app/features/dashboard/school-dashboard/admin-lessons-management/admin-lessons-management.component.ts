import { Component, OnInit } from '@angular/core';
import { StatisticsService } from '../../../../services/statistics.service';

interface MonthlyLessonData {
  month: string;
  totalLessons: number;
  completedLessons: number;
  cancelledLessons: number;
  successRate: number;
}

@Component({
  selector: 'app-admin-lessons-management',
  templateUrl: './admin-lessons-management.component.html',
  styleUrls: ['./admin-lessons-management.component.css']
})
export class AdminLessonsManagementComponent implements OnInit {
  currentMonth: string = new Date().toISOString().slice(0, 7);
  selectedMonth: string = this.currentMonth;
  
  lessonsStats = {
    totalLessons: 0,
    completedLessons: 0,
    cancelledLessons: 0,
    successRate: 0,
    month: ''
  };

  monthlyData: MonthlyLessonData[] = [];
  loading = false;

  // Options pour le sélecteur de mois (derniers 12 mois)
  monthOptions: {value: string, label: string}[] = [];

  constructor(private statisticsService: StatisticsService) {}

  ngOnInit(): void {
    this.generateMonthOptions();
    this.loadLessonsStats();
  }

  generateMonthOptions() {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    this.monthOptions = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const value = date.toISOString().slice(0, 7);
      const label = `${months[date.getMonth()]} ${date.getFullYear()}`;
      this.monthOptions.push({ value, label });
    }
  }

  loadLessonsStats() {
    this.loading = true;
    this.statisticsService.getAdminLessonsStats(this.selectedMonth).subscribe({
      next: (data) => {
        this.lessonsStats = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des statistiques de cours:', err);
        this.loading = false;
      }
    });
  }

  onMonthChange() {
    this.loadLessonsStats();
  }

  loadLastMonthsData() {
    // Charge les données des 6 derniers mois pour affichage graphique
    const promises = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toISOString().slice(0, 7);
      promises.push(this.statisticsService.getAdminLessonsStats(month).toPromise());
    }

    Promise.all(promises).then(results => {
      this.monthlyData = results.reverse(); // Plus ancien en premier
    }).catch(err => {
      console.error('Erreur lors du chargement des données mensuelles:', err);
    });
  }

  get selectedMonthLabel(): string {
    const option = this.monthOptions.find(opt => opt.value === this.selectedMonth);
    return option ? option.label : this.selectedMonth;
  }

  get pendingLessons(): number {
    return this.lessonsStats.totalLessons - this.lessonsStats.completedLessons - this.lessonsStats.cancelledLessons;
  }

  get lessonsEfficiency(): string {
    if (this.lessonsStats.totalLessons === 0) return 'Aucune donnée';
    
    const rate = this.lessonsStats.successRate;
    if (rate >= 90) return 'Excellent';
    if (rate >= 80) return 'Très bien';
    if (rate >= 70) return 'Bien';
    if (rate >= 60) return 'Acceptable';
    return 'À améliorer';
  }
} 