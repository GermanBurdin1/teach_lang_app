import { Component, Input, OnInit } from '@angular/core';

// TODO : ajouter templates prédéfinis pour différents types de landing
export class PreviewLandingComponent implements OnInit {
  @Input() data = {
    title: 'Espace pour le titre',
    subtitle: 'Espace pour le sous-titre',
    image: '', // ou chemin vers image par défaut
    buttonText: 'Laissez une demande',
    callToAction: 'Laissez une demande de formation',
  };

  defaultBlocks = [
    {
      title: 'À propos de moi',
      subtitle: 'Description courte',
      content: '',
      image: ''
    }
  ];

  constructor() { }

  ngOnInit(): void {
    // TODO : charger les données depuis l'API
    // on ajoute d'autres blocs par analogie
    const filledData = {
      ...this.data,
      blocks: this.defaultBlocks
    };

    this.data = filledData; // on remplace les données par défaut par celles remplies
  }

}
