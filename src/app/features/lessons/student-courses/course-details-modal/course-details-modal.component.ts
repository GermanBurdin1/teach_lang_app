import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Course } from '../../../../services/course.service';

export interface CourseDetailsModalData {
  course: Course;
}

@Component({
  selector: 'app-course-details-modal',
  templateUrl: './course-details-modal.component.html',
  styleUrls: ['./course-details-modal.component.css']
})
export class CourseDetailsModalComponent implements OnInit {
  course: Course;
  expandedSections: Set<string> = new Set();
  expandedSubSections: { [key: string]: Set<string> } = {};

  constructor(
    public dialogRef: MatDialogRef<CourseDetailsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CourseDetailsModalData
  ) {
    this.course = data.course;
  }

  ngOnInit(): void {
    // Разворачиваем все секции по умолчанию
    if (this.course.sections) {
      this.course.sections.forEach(section => {
        this.expandedSections.add(section);
      });
    }
  }

  toggleSection(section: string): void {
    if (this.expandedSections.has(section)) {
      this.expandedSections.delete(section);
    } else {
      this.expandedSections.add(section);
    }
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections.has(section);
  }

  toggleSubSection(section: string, subSection: string): void {
    const key = `${section}_${subSection}`;
    if (!this.expandedSubSections[section]) {
      this.expandedSubSections[section] = new Set();
    }
    if (this.expandedSubSections[section].has(subSection)) {
      this.expandedSubSections[section].delete(subSection);
    } else {
      this.expandedSubSections[section].add(subSection);
    }
  }

  isSubSectionExpanded(section: string, subSection: string): boolean {
    return this.expandedSubSections[section]?.has(subSection) || false;
  }

  getLessonsInSection(section: string): Array<{ name: string; type: 'self' | 'call'; description?: string }> {
    return this.course.lessons?.[section] || [];
  }

  getLessonsInSubSection(section: string, subSection: string): Array<{ name: string; type: 'self' | 'call'; description?: string }> {
    return this.course.lessonsInSubSections?.[section]?.[subSection] || [];
  }

  getSubSectionsForSection(section: string): string[] {
    return this.course.subSections?.[section] || [];
  }

  close(): void {
    this.dialogRef.close();
  }
}

