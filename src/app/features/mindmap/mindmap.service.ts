import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../core/constants/api.constants';
import { MindmapNode } from './models/mindmap-node.model';
import { CreateMindmapDto, Mindmap } from './models/mindmap.model';

interface UpdateNodeResponse {
  success: boolean;
  message?: string;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class MindmapService {
  private readonly baseUrl = API_ENDPOINTS.MINDMAP;

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

  createMindMap(dto: CreateMindmapDto): Observable<Mindmap> {
    return this.http.post<Mindmap>(this.baseUrl, dto);
  }

  deleteNode(id: string): Observable<UpdateNodeResponse> {
    return this.http.delete<UpdateNodeResponse>(`${this.baseUrl}/${id}`);
  }

  updateNodeText(
    nodeId: string,
    field: 'rule' | 'exception' | 'example' | 'exercise',
    content: string
  ): Observable<UpdateNodeResponse> {
    return this.http.patch<UpdateNodeResponse>(`${this.baseUrl}/${nodeId}`, {
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
  ): Observable<UpdateNodeResponse> {
    return this.http.patch<UpdateNodeResponse>(`${this.baseUrl}/${nodeId}/position`, data);
  }

  saveAllPositions(nodes: { id: string; x: number; y: number }[]): Observable<UpdateNodeResponse> {
    return this.http.post<UpdateNodeResponse>(`${this.baseUrl}/save-positions`, { nodes });
  }

  updateTitle(id: string, title: string): Observable<UpdateNodeResponse> {
    return this.http.patch<UpdateNodeResponse>(`${this.baseUrl}/${id}`, { title });
  }

  updateExpanded(id: string, expanded: boolean): Observable<UpdateNodeResponse> {
    return this.http.patch<UpdateNodeResponse>(`${this.baseUrl}/${id}`, { expanded });
  }

  bulkSave(nodes: MindmapNode[]): Observable<UpdateNodeResponse> {
    return this.http.post<UpdateNodeResponse>(`${this.baseUrl}/bulk-save`, { nodes });
  }

}
