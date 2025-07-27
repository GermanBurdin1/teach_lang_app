import { Component, AfterViewInit } from '@angular/core';
import { Tooltip } from 'bootstrap';

@Component({
  selector: 'app-materials',
  templateUrl: './materials.component.html',
  styleUrls: ['./materials.component.css']
})
export class MaterialsComponent implements AfterViewInit {
document: any;

  ngAfterViewInit(): void {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(tooltipTriggerEl => {
      new Tooltip(tooltipTriggerEl);
    });
  }

  selectedFile: File | null = null;
  courses = [
    { id: 1, name: 'A1', letter: 'A' }
  ];

  selectedCourseId: number | null = null;
  showDeleteModal = false;

  // Fonction pour gérer la sélection de fichier
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      console.log('Fichier sélectionné :', this.selectedFile.name);
    }
  }

  // Ouvrir la modale de suppression
  openDeleteModal(courseId: number): void {
    this.selectedCourseId = courseId;
    this.showDeleteModal = true;
  }

  // Fermer la modale de suppression
  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  // Supprimer le cours
  deleteCourse(): void {
    if (this.selectedCourseId !== null) {
      this.courses = this.courses.filter(course => course.id !== this.selectedCourseId);
      this.selectedCourseId = null;
      this.closeDeleteModal();
    }
  }

  //filtres => principaux

  isFilterModalOpen = false;
  selectedFilters: any = {}; // Objet pour stocker les valeurs sélectionnées des filtres

  filters = [
    { label: 'Langue', placeholder: 'Choisissez la langue', type: 'language', options: ['Russe', 'Anglais', 'Espagnol'] },
    { label: 'Âge', placeholder: 'Choisissez l\'âge', type: 'age', options: ['Enfants', 'Ados', 'Adultes'] },
    { label: 'Niveau', placeholder: 'Choisissez le niveau', type: 'level', options: ['Débutant', 'Intermédiaire', 'Avancé'] },
    { label: 'Type', placeholder: 'Choisissez le type', type: 'type', options: ['Général', 'Business', 'Pour les voyages'] },
    { label: 'Compétences', placeholder: 'Choisissez la compétence', type: 'skills', options: ['Grammaire', 'Lexique', 'Écriture'] },
    { label: 'Moment', placeholder: 'Choisissez le moment', type: 'time', options: ['Matin', 'Jour', 'Soir'] },
    { label: 'Grammaire', placeholder: 'Entrez le type', type: 'grammar', options: ['Bases', 'Avancé'] },
    { label: 'Lexique', placeholder: 'Choisissez le lexique', type: 'vocabulary', options: ['De base', 'Avancé'] },
    { label: 'Fonctions', placeholder: 'Choisissez la fonction', type: 'functions', options: ['Conversation', 'Écriture', 'Lecture'] },
    { label: 'Autre', placeholder: 'Choisissez le tag', type: 'other', options: ['Supplémentaire', 'Spécial'] }
  ];



  openFilterModal(): void {
    this.isFilterModalOpen = true;
  }

  closeFilterModal(): void {
    this.isFilterModalOpen = false;
  }

  resetFilters(): void {
    this.selectedFilters = {}; // Réinitialiser tous les filtres sélectionnés
    console.log('Réinitialiser tous les filtres');
  }

  applyFilters(): void {
    console.log('Appliquer les filtres', this.selectedFilters);
    // Logique d'application des filtres sélectionnés
  }

  ///////////////////////////////// carte interactive
  isCreateBoardModalOpen = false;

  openCreateBoardModal(): void {
    this.isCreateBoardModalOpen = true;
    console.log('Ouverture de la modale pour créer un nouveau tableau');
  }

  closeCreateBoardModal(): void {
    this.isCreateBoardModalOpen = false;
    console.log('Fermeture de la modale de création de tableau');
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('coverUpload') as HTMLInputElement;
    fileInput?.click();
  }
}
