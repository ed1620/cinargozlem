import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './modules/auth/LoginPage';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { FinancePage } from './modules/finance/FinancePage';
import { NotificationsPage } from './modules/notifications/NotificationsPage';
import { PersonnelDetailPage } from './modules/personnel/PersonnelDetailPage';
import { PersonnelPage } from './modules/personnel/PersonnelPage';
import { ReportsPage } from './modules/reports/ReportsPage';
import { StudentDetailPage } from './modules/students/StudentDetailPage';
import { StudentsPage } from './modules/students/StudentsPage';
import { RbacMatrixPage } from './modules/users/RbacMatrixPage';
import { UsersPage } from './modules/users/UsersPage';
import { VehicleDetailPage } from './modules/vehicles/VehicleDetailPage';
import { VehiclesPage } from './modules/vehicles/VehiclesPage';
import { useAuth } from './store/auth.store';
import { ModuleCode } from './types';

export default function App() {
  const loadMe = useAuth((s) => s.loadMe);
  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const guarded = (module: ModuleCode, el: JSX.Element) => (
    <ProtectedRoute module={module}>{el}</ProtectedRoute>
  );

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route path="students" element={guarded('STUDENTS', <StudentsPage />)} />
        <Route path="students/:id" element={guarded('STUDENTS', <StudentDetailPage />)} />

        <Route path="personnel" element={guarded('PERSONNEL', <PersonnelPage />)} />
        <Route path="personnel/:id" element={guarded('PERSONNEL', <PersonnelDetailPage />)} />

        <Route path="finance" element={guarded('FINANCE', <FinancePage />)} />

        <Route path="vehicles" element={guarded('VEHICLES', <VehiclesPage />)} />
        <Route path="vehicles/:id" element={guarded('VEHICLES', <VehicleDetailPage />)} />

        <Route path="notifications" element={guarded('NOTIFICATIONS', <NotificationsPage />)} />
        <Route path="reports" element={guarded('REPORTS', <ReportsPage />)} />

        <Route path="users" element={guarded('USERS', <UsersPage />)} />
        <Route path="users/matrix" element={guarded('USERS', <RbacMatrixPage />)} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
