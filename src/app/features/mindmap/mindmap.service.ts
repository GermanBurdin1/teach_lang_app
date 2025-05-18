import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MindmapNode } from './models/mindmap-node.model'; // ✅ путь к твоей модели

@Injectable({
  providedIn: 'root'
})
export class MindmapService {
  private readonly baseUrl = 'http://localhost:3002/mindmap';

  constructor(private http: HttpClient) { }

  getAll(): Observable<MindmapNode[]> {
    return this.http.get<MindmapNode[]>(this.baseUrl);
  }

  getOne(id: string): Observable<MindmapNode> {
    return this.http.get<MindmapNode>(`${this.baseUrl}/${id}`);
  }

  createNode(node: Partial<MindmapNode>): Observable<MindmapNode> {
    return this.http.post<MindmapNode>(this.baseUrl, node);
  }

  deleteNode(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  updateNodeText(
    nodeId: string,
    field: 'rule' | 'exception' | 'example' | 'exercise',
    content: string
  ): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${nodeId}`, {
      type: field,
      content
    });
  }

  updateNodePosition(
    nodeId: string,
    data: {
      parentId: string | null;
      x: number;
      y: number;
      side: 'left' | 'right';
      expanded: boolean;
    }
  ): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${nodeId}/position`, data);
  }

  saveAllPositions(nodes: { id: string; x: number; y: number }[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/save-positions`, { nodes });
  }

  updateTitle(id: string, title: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}`, { title });
  }

  updateExpanded(id: string, expanded: boolean): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}`, { expanded });
  }

  bulkSave(nodes: MindmapNode[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/bulk-save`, { nodes });
  }

}
