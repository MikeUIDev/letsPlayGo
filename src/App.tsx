import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { GoGamePage } from './games/go/GoGamePage';
import { LearnPage } from './games/go/learn/LearnPage';
import { TutorialHubPage } from './games/go/tutorial/TutorialHubPage';
import { TutorialLessonPage } from './games/go/tutorial/TutorialLessonPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<GoGamePage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/learn/tutorial" element={<TutorialHubPage />} />
          <Route path="/learn/tutorial/:lessonId" element={<TutorialLessonPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
