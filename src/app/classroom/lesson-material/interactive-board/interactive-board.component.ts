import { Component, AfterViewInit, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Room } from 'white-web-sdk';
import { WhiteboardService } from '../../../services/whiteboard.service';
import { ApplianceNames } from 'white-web-sdk';
import { environment } from '../../../../../environment';


@Component({
  selector: 'app-interactive-board',
  templateUrl: './interactive-board.component.html',
  styleUrls: ['./interactive-board.component.css'],
})
export class InteractiveBoardComponent implements OnInit, AfterViewInit {
  @ViewChild('whiteboardContainer', { static: false }) whiteboardContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('videoCallElement', { static: false }) videoCallElement!: ElementRef;
  zoomLevel = 1; // Current zoom level
  panX = 0; // Horizontal pan offset
  panY = 0; // Vertical pan offset

  // Brush settings
  brushColor = '#000000'; // Default brush color
  brushWidth = 5; // Default brush width

  // Current tool
  currentTool: 'brush' | 'rectangle' | 'circle' = 'brush';
  // Drapeau pour la vidéo flottante
  isFloatingVideo: boolean = false;
  floatingVideoPosition = { x: window.innerWidth - 320, y: 20 }; // Position initiale (en haut à droite)
  dragging = false;
  offsetX = 0;
  offsetY = 0;
  private room?: Room;


  constructor(
    private cdr: ChangeDetectorRef,
    private whiteboardService: WhiteboardService
    // lessonTabsService supprimé car non utilisé
  ) { }

  ngOnInit(): void {
    this.whiteboardService.room$.subscribe((room) => {
      if (room) {
        if (!environment.production) {
          console.log("🎨 Salle configurée dans le composant:", room);
        }
        this.room = room;
      } else {
        if (!environment.production) {
          console.log("❌ La salle n'est toujours pas configurée");
        }
      }
    });
    if (!environment.production) {
      console.log('📌 BoardComponent chargé');
    }
    window.setTimeout(() => {

      // 🔥 Délai avant la mise à jour du Board
      window.setTimeout(() => {
        this.cdr.detectChanges();
      }, 100);
    }, 500);
  }

  getCurrentUserId(): string {
    return window.localStorage.getItem('userId') || 'guest';
  }

  ngAfterViewInit(): void {
    if (!environment.production) {
      console.log("📌 Conteneur trouvé via @ViewChild:", this.whiteboardContainer.nativeElement);
    }
    this.whiteboardService.createRoomAndJoin(this.getCurrentUserId(), this.whiteboardContainer.nativeElement);
  }




  // dessin
  setDrawingMode(): void {
    if (this.room) {
      if (!environment.production) {
        console.log("🖌 Configuration du mode dessin...");
      }
      this.room.setMemberState({
        currentApplianceName: ApplianceNames.pencil, // Outil: crayon
        strokeColor: [0, 0, 0], // Couleur noire
        strokeWidth: 4, // Épaisseur de ligne
      });
      if (!environment.production) {
        console.log("✅ Mode dessin configuré.");
      }
    } else {
      if (!environment.production) {
        console.error("❌ Erreur: la salle (room) n'est pas définie!");
      }
    }
  }

  setTextMode(): void {
    if (this.room) {
      this.room.setMemberState({
        currentApplianceName: ApplianceNames.text,
        textSize: 16,
      });
    }
  }

  setEraserMode(): void {
    if (this.room) {
      this.room.setMemberState({
        currentApplianceName: ApplianceNames.eraser,
      });
    }
  }

  zoomIn(): void {
    if (this.room) {
      const scale = this.room.state.cameraState.scale;
      this.room.moveCamera({ scale: Math.min(scale + 0.2, 3) }); // Zoom maximum = 3x
    }
  }

  zoomOut(): void {
    if (this.room) {
      const scale = this.room.state.cameraState.scale;
      this.room.moveCamera({ scale: Math.max(scale - 0.2, 0.5) }); // Zoom minimum = 0.5x
    }
  }

  moveCanvas(x: number, y: number): void {
    if (this.room) {
      const camera = this.room.state.cameraState;
      this.room.moveCamera({
        centerX: camera.centerX + x,
        centerY: camera.centerY + y,
      });
    }
  }


  changeBrushColor(color: string): void {
    if (this.room) {
      this.room.setMemberState({
        strokeColor: this.hexToRgb(color),
      });
    }
  }

  changeBrushWidth(width: number): void {
    if (this.room) {
      this.room.setMemberState({
        strokeWidth: width,
      });
    }
  }

  selectTool(tool: 'pencil' | 'rectangle' | 'ellipse'): void {
    if (this.room) {
      this.room.setMemberState({
        currentApplianceName: ApplianceNames[tool as keyof typeof ApplianceNames],
      });
    }
  }

  setRectangleMode(): void {
    if (this.room) {
      this.room.setMemberState({
        currentApplianceName: ApplianceNames.rectangle,
        strokeColor: [255, 0, 0],
        strokeWidth: 3,
      });
    }
  }

  setEllipseMode(): void {
    if (this.room) {
      if (!environment.production) {
        console.log("✍️ Writable avant la configuration de l'outil:", this.room?.isWritable);
      }
      this.room.setMemberState({
        currentApplianceName: ApplianceNames.ellipse,
        strokeColor: [0, 0, 255],
        strokeWidth: 3,
      });
      if (!environment.production) {
        console.log("🔍 État actuel:", this.room?.state.memberState);
      }
    } else {
      if (!environment.production) {
        console.error("❌ Erreur: la salle (room) n'est pas définie!");
      }
    }
  }


  setLineMode(): void {
    if (this.room) {
      this.room.setMemberState({
        currentApplianceName: ApplianceNames.straight,
        strokeColor: [0, 0, 0],
        strokeWidth: 2,
      });
    }
  }

  clearBoard(): void {
    if (this.room) {
      this.room.cleanCurrentScene(false); // false - supprime tout, y compris PPT
    }
  }

  undoLastAction(): void {
    if (this.room) {
      const remainingUndos = this.room.undo();
      if (!environment.production) {
        console.log(`🛑 Annulation de la dernière action. Annulations restantes: ${remainingUndos}`);
      }
    }
  }

  setSelectionMode(): void {
    if (this.room) {
      this.room.setMemberState({
        currentApplianceName: ApplianceNames.clicker,
      });
    }
  }

  changeFontSize(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const fontSize = parseInt(inputElement.value, 10);

    if (this.room) {
      this.room.setMemberState({
        textSize: fontSize,
      });
    }
  }

  changeTextColor(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const color = inputElement.value;

    if (this.room) {
      this.room.setMemberState({
        strokeColor: this.hexToRgb(color),
      });
    }
  }

  resetPosition(): void {
    if (this.room) {
      this.room.moveCamera({
        centerX: 0,
        centerY: 0,
        scale: 1,
      });
    }
  }


  // Fonction pour convertir HEX en RGB (requis par Agora)
  private hexToRgb(hex: string): number[] {
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }

  // ajout de notes
  addStickyNote(): void {
    const note = window.document.createElement('div');
    note.className = 'sticky-note';
    note.contentEditable = 'true';
    note.innerText = 'Nouvelle note';
    note.style.position = 'absolute';
    note.style.top = '100px';
    note.style.left = '100px';
    note.style.backgroundColor = 'yellow';
    note.style.padding = '10px';
    note.style.borderRadius = '5px';
    note.style.cursor = 'move';

    window.document.body.appendChild(note);
  }

  addTextToBoard(text: string, x: number, y: number): void {
    if (this.room) {
      this.room.insertText(x, y, text);
    }
  }

}
