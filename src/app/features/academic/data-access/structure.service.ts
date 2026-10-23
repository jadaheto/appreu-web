import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core';
import type {
  AcademicDashboard,
  Classroom,
  ClassroomInput,
  ClassroomTeachingLoad,
  Grade,
  GradeCurriculum,
  GradeInput,
  Subject,
  SubjectInput,
  Teacher,
  TeachingAssignment,
} from './academic.models';

/** Grados, plan de estudios, salones, directores de grupo y carga docente (`/api/academic/*`, admin). */
@Injectable({ providedIn: 'root' })
export class AcademicStructureService {
  private readonly api = inject(ApiClient);

  dashboard(year?: number | null): Observable<AcademicDashboard> {
    return this.api.get<AcademicDashboard>('academic/dashboard', { params: { year } });
  }

  grades(): Observable<Grade[]> {
    return this.api.get<Grade[]>('academic/grades');
  }
  createGrade(dto: GradeInput): Observable<Grade> {
    return this.api.post<Grade>('academic/grades', dto);
  }
  updateGrade(id: number, dto: GradeInput): Observable<Grade> {
    return this.api.patch<Grade>(`academic/grades/${id}`, dto);
  }
  deleteGrade(id: number): Observable<void> {
    return this.api.delete(`academic/grades/${id}`);
  }

  curriculum(gradeId: number): Observable<GradeCurriculum> {
    return this.api.get<GradeCurriculum>(`academic/grades/${gradeId}/subjects`);
  }
  addSubject(gradeId: number, dto: SubjectInput): Observable<Subject> {
    return this.api.post<Subject>(`academic/grades/${gradeId}/subjects`, dto);
  }
  updateSubject(id: number, dto: SubjectInput): Observable<Subject> {
    return this.api.patch<Subject>(`academic/subjects/${id}`, dto);
  }
  deleteSubject(id: number): Observable<void> {
    return this.api.delete(`academic/subjects/${id}`);
  }

  classrooms(year?: number | null): Observable<Classroom[]> {
    return this.api.get<Classroom[]>('academic/classrooms', { params: { year } });
  }
  createClassroom(dto: ClassroomInput): Observable<Classroom> {
    return this.api.post<Classroom>('academic/classrooms', dto);
  }
  updateClassroom(id: number, dto: Required<ClassroomInput>): Observable<Classroom> {
    return this.api.patch<Classroom>(`academic/classrooms/${id}`, dto);
  }
  deleteClassroom(id: number): Observable<void> {
    return this.api.delete(`academic/classrooms/${id}`);
  }
  /** `employeeId = null` quita el director actual. */
  assignDirector(classroomId: number, employeeId: number | null): Observable<void> {
    return this.api.put<void>(`academic/classrooms/${classroomId}/director`, { employeeId });
  }

  teachingLoad(classroomId: number): Observable<ClassroomTeachingLoad> {
    return this.api.get<ClassroomTeachingLoad>(`academic/classrooms/${classroomId}/assignments`);
  }
  assignTeacher(dto: {
    employeeId: number;
    subjectId: number;
    classroomId: number;
  }): Observable<TeachingAssignment> {
    return this.api.post<TeachingAssignment>('academic/assignments', dto);
  }
  changeTeacher(assignmentId: number, employeeId: number): Observable<TeachingAssignment> {
    return this.api.patch<TeachingAssignment>(`academic/assignments/${assignmentId}`, {
      employeeId,
    });
  }
  removeAssignment(assignmentId: number): Observable<void> {
    return this.api.delete(`academic/assignments/${assignmentId}`);
  }

  teachers(): Observable<Teacher[]> {
    return this.api.get<Teacher[]>('academic/teachers');
  }
}
