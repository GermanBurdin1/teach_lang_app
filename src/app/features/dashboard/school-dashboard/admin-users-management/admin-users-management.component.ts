import { Component, OnInit } from '@angular/core';
import { StatisticsService } from '../../../../services/statistics.service';

interface MonthlyUserData {
  month: string;
  newStudents: number;
  newTeachers: number;
  totalNew: number;
}

@Component({
  selector: 'app-admin-users-management',
  templateUrl: './admin-users-management.component.html',
  styleUrls: ['./admin-users-management.component.css']
})
export class AdminUsersManagementComponent implements OnInit {
  currentMonth: string = new Date().toISOString().slice(0, 7); // Format: 2025-01
  selectedMonth: string = this.currentMonth;
  
  userStats = {
    newStudents: 0,
    newTeachers: 0,
    totalNew: 0,
    month: ''
  };

  monthlyData: MonthlyUserData[] = [];
  loading = false;

  // Options pour le sélecteur de mois (derniers 12 mois)
  monthOptions: {value: string, label: string}[] = [];

  constructor(private statisticsService: StatisticsService) {}

  ngOnInit(): void {
    this.generateMonthOptions();
    this.loadUserStats();
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

  loadUserStats() {
    this.loading = true;
    this.statisticsService.getAdminUserStats(this.selectedMonth).subscribe({
      next: (data) => {
        this.userStats = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des statistiques utilisateurs:', err);
        this.loading = false;
      }
    });
  }

  onMonthChange() {
    this.loadUserStats();
  }

  loadLastMonthsData() {
    // Charge les données des 6 derniers mois pour affichage graphique
    const promises = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toISOString().slice(0, 7);
      promises.push(this.statisticsService.getAdminUserStats(month).toPromise());
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
} 