import React, { useState } from 'react';
import { FamilyProvider } from './context/FamilyContext';
import { Header, ActiveTab } from './components/Header';
import { DashboardToday } from './components/DashboardToday';
import { CarModule } from './components/CarModule';
import { TasksModule } from './components/TasksModule';
import { CalendarModule } from './components/CalendarModule';
import { WeekOverview } from './components/WeekOverview';
import { AdminSettings } from './components/AdminSettings';
import { ReserveCarModal } from './components/Modals/ReserveCarModal';
import { CreateTaskModal } from './components/Modals/CreateTaskModal';
import { AddCalendarEventModal } from './components/Modals/AddCalendarEventModal';

function MainApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isReserveCarOpen, setIsReserveCarOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isAddCalendarEventOpen, setIsAddCalendarEventOpen] = useState(false);

  return (
    <div
      className="min-h-screen text-slate-800 flex flex-col font-sans selection:bg-orange-200 selection:text-orange-950 relative overflow-x-hidden"
      style={{
        background: 'radial-gradient(circle at 0% 0%, #e0e7ff 0%, #f1f5f9 50%, #f8fafc 100%)',
      }}
    >
      {/* Frosted Glass Ambient Lighting Orbs */}
      <div className="fixed top-[-100px] left-[-100px] w-96 h-96 bg-blue-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50 pointer-events-none -z-10" />
      <div className="fixed bottom-[-80px] right-[-80px] w-[30rem] h-[30rem] bg-orange-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-60 pointer-events-none -z-10" />
      <div className="fixed top-[40%] right-[30%] w-80 h-80 bg-indigo-200/35 rounded-full mix-blend-multiply filter blur-3xl opacity-40 pointer-events-none -z-10" />

      {/* Global Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenReserveCar={() => setIsReserveCarOpen(true)}
        onOpenCreateTask={() => setIsCreateTaskOpen(true)}
      />

      {/* Main Container */}
      <main
        className={`flex-1 min-h-0 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4 pb-20 md:pb-4 ${
          activeTab === 'calendar' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'
        }`}
      >
        {activeTab === 'dashboard' && (
          <DashboardToday
            setActiveTab={setActiveTab}
            onOpenReserveCar={() => setIsReserveCarOpen(true)}
            onOpenCreateTask={() => setIsCreateTaskOpen(true)}
            onOpenAddCalendarEvent={() => setIsAddCalendarEventOpen(true)}
          />
        )}

        {activeTab === 'car' && (
          <CarModule onOpenReserveCar={() => setIsReserveCarOpen(true)} />
        )}

        {activeTab === 'tasks' && (
          <TasksModule />
        )}

        {activeTab === 'calendar' && (
          <div className="flex-1 min-h-0">
            <CalendarModule onOpenAddEvent={() => setIsAddCalendarEventOpen(true)} />
          </div>
        )}

        {activeTab === 'week' && <WeekOverview />}

        {activeTab === 'settings' && <AdminSettings />}
      </main>

      {/* Global Modals */}
      <ReserveCarModal
        isOpen={isReserveCarOpen}
        onClose={() => setIsReserveCarOpen(false)}
      />

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
      />

      <AddCalendarEventModal
        isOpen={isAddCalendarEventOpen}
        onClose={() => setIsAddCalendarEventOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <FamilyProvider>
      <MainApp />
    </FamilyProvider>
  );
}
