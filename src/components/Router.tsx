import { useState, useEffect } from 'react';
import LandingPage from '../pages/LandingPage';
import AdminPanel from '../pages/AdminPanel';
import TeamDashboard from '../pages/TeamDashboard';
import PublicDashboard from '../pages/PublicDashboard';
import { getTeamSession, getAdminSession } from '../utils/auth';

type Page = 'landing' | 'admin' | 'team' | 'public';

export default function Router() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page') as Page;

    if (page === 'public') {
      setCurrentPage('public');
    } else if (page === 'admin' && getAdminSession()) {
      setCurrentPage('admin');
    } else if (page === 'team' && getTeamSession()) {
      setCurrentPage('team');
    } else {
      setCurrentPage('landing');
    }
  }, []);

  const navigate = (page: Page) => {
    setCurrentPage(page);
    window.history.pushState({}, '', `?page=${page}`);
  };

  switch (currentPage) {
    case 'admin':
      return <AdminPanel onNavigate={navigate} />;
    case 'team':
      return <TeamDashboard onNavigate={navigate} />;
    case 'public':
      return <PublicDashboard onNavigate={navigate} />;
    default:
      return <LandingPage onNavigate={navigate} />;
  }
}
