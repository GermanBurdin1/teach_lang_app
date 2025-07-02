import { Component, OnInit } from '@angular/core';
import { StatisticsService } from '../../../../services/statistics.service';

@Component({
  selector: 'app-admin-platform-analytics',
  templateUrl: './admin-platform-analytics.component.html',
  styleUrls: ['./admin-platform-analytics.component.css']
})
export class AdminPlatformAnalyticsComponent implements OnInit {
  
  platformStats = {
    monthlyUserGrowth: 0,
    monthlyLessons: 0,
    topLanguagePairs: [] as Array<{pair: string, count: number}>,
    platformActivity: {
      activeUsers: 0,
      totalLogins: 0
    }
  };

  combinedStats = {
    users: { newStudents: 0, newTeachers: 0, totalNew: 0 },
    lessons: { totalLessons: 0, completedLessons: 0, successRate: 0 }
  };

  loading = false;
  lastUpdated: Date = new Date();

  constructor(private statisticsService: StatisticsService) {}

  ngOnInit(): void {
    this.loadPlatformStats();
    this.loadCombinedStats();
  }

  loadPlatformStats() {
    this.loading = true;
    this.statisticsService.getAdminPlatformStats().subscribe({
      next: (data) => {
        this.platformStats = data;
        this.loading = false;
        this.lastUpdated = new Date();
      },
      error: (err) => {
        console.error('Erreur lors du chargement des statistiques de plateforme:', err);
        this.loading = false;
      }
    });
  }

  loadCombinedStats() {
    // Charge les stats des utilisateurs et des cours pour le mois actuel
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    Promise.all([
      this.statisticsService.getAdminUserStats(currentMonth).toPromise(),
      this.statisticsService.getAdminLessonsStats(currentMonth).toPromise()
    ]).then(([userStats, lessonStats]) => {
      this.combinedStats.users = userStats;
      this.combinedStats.lessons = lessonStats;
    }).catch(err => {
      console.error('Erreur lors du chargement des statistiques combinées:', err);
    });
  }

  refreshAll() {
    this.loadPlatformStats();
    this.loadCombinedStats();
  }

  get userGrowthTrend(): string {
    const growth = this.platformStats.monthlyUserGrowth;
    if (growth > 50) return 'Excellente croissance';
    if (growth > 20) return 'Bonne croissance';
    if (growth > 10) return 'Croissance modérée';
    if (growth > 0) return 'Croissance lente';
    return 'Pas de croissance';
  }

  get userGrowthClass(): string {
    const growth = this.platformStats.monthlyUserGrowth;
    if (growth > 50) return 'excellent';
    if (growth > 20) return 'good';
    if (growth > 10) return 'average';
    if (growth > 0) return 'poor';
    return 'critical';
  }

  get platformHealth(): string {
    const lessons = this.combinedStats.lessons.successRate;
    const users = this.platformStats.monthlyUserGrowth;
    
    if (lessons >= 80 && users >= 20) return 'Excellente santé';
    if (lessons >= 70 && users >= 10) return 'Bonne santé';
    if (lessons >= 60 && users >= 5) return 'Santé correcte';
    return 'Attention requise';
  }

  get platformHealthClass(): string {
    const health = this.platformHealth;
    if (health.includes('Excellente')) return 'excellent';
    if (health.includes('Bonne')) return 'good';
    if (health.includes('correcte')) return 'average';
    return 'poor';
  }

  get topLanguagePair(): any {
    return this.platformStats.topLanguagePairs.length > 0 ? this.platformStats.topLanguagePairs[0] : null;
  }

  get engagementRate(): number {
    const { activeUsers, totalLogins } = this.platformStats.platformActivity;
    if (activeUsers === 0) return 0;
    return Math.round((totalLogins / activeUsers) * 100) / 100;
  }
} 