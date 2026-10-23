import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient, withContext } from '../../../core';
import type {
  AdminDashboard,
  EmployeeDashboard,
  PortalContext,
  StudentDashboard,
} from './dashboard.models';

/**
 * KPIs del inicio de cada portal. Los errores no muestran toast: cada página
 * presenta su propio estado de error (p. ej. empleado sin ficha vinculada).
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiClient);
  private readonly silent = { context: withContext({ skipErrorToast: true }) };

  admin(): Observable<AdminDashboard> {
    return this.api.get<AdminDashboard>('dashboard/admin', this.silent);
  }

  employee(): Observable<EmployeeDashboard> {
    return this.api.get<EmployeeDashboard>('me/employee/dashboard', this.silent);
  }

  portalContext(): Observable<PortalContext> {
    return this.api.get<PortalContext>('portal/context', this.silent);
  }

  student(studentId: number): Observable<StudentDashboard> {
    return this.api.get<StudentDashboard>(`portal/students/${studentId}/dashboard`, this.silent);
  }
}
