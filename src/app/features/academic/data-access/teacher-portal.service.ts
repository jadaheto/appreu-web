import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core';
import type { Classroom, DirectorDashboard, MyTeachingAssignment } from './academic.models';

/** Portal docente y del director de grupo. */
@Injectable({ providedIn: 'root' })
export class TeacherPortalService {
  private readonly api = inject(ApiClient);

  myAssignments(year?: number | null): Observable<MyTeachingAssignment[]> {
    return this.api.get<MyTeachingAssignment[]>('academic/me/assignments', { params: { year } });
  }
  directedClassrooms(): Observable<Classroom[]> {
    return this.api.get<Classroom[]>('academic/director/classrooms');
  }
  directorDashboard(classroomId: number): Observable<DirectorDashboard> {
    return this.api.get<DirectorDashboard>(`academic/director/classrooms/${classroomId}/dashboard`);
  }
}
