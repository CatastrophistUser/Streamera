import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { HomePage } from '@/pages/HomePage';
import { WatchPage } from '@/pages/WatchPage';
import { SearchPage } from '@/pages/SearchPage';
import { LightsProvider } from '@/context/LightsContext';

function App() {
  return (
    <LightsProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="watch/:type/:id" element={<WatchPage />} />
            <Route path="movies" element={<HomePage />} />
            <Route path="tv" element={<HomePage />} />
          </Route>
        </Routes>
      </HashRouter>
    </LightsProvider>
  );
}

export default App;
