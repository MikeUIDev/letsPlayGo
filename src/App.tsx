import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { HomePage } from './games/go/home/HomePage';
import { GoGamePage } from './games/go/GoGamePage';
import { LearnPage } from './games/go/learn/LearnPage';
import { PracticeHubPage } from './games/go/practice/PracticeHubPage';
import { PuzzlePage } from './games/go/practice/PuzzlePage';
import { SettingsPage } from './games/go/settings/SettingsPage';
import { TutorialHubPage } from './games/go/tutorial/TutorialHubPage';
import { TutorialLessonPage } from './games/go/tutorial/TutorialLessonPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/play" element={<GoGamePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/learn/tutorial" element={<TutorialHubPage />} />
          <Route path="/learn/tutorial/:lessonId" element={<TutorialLessonPage />} />
          <Route path="/practice" element={<PracticeHubPage />} />
          <Route path="/practice/:puzzleId" element={<PuzzlePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
