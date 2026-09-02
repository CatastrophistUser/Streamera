import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { HomePage } from '@/pages/HomePage';
import { WatchPage } from '@/pages/WatchPage';
import { SearchPage } from '@/pages/SearchPage';
import { LoadingScreen } from '@/components/layout/LoadingScreen';

import { ThemeProvider } from '@/context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <LoadingScreen />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Distinct keys remount HomePage when switching between these routes,
                so its items/page/carousel state resets without an effect doing it. */}
            <Route index element={<HomePage key="all" />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="watch/:type/:id" element={<WatchPage />} />
            <Route path="movies" element={<HomePage key="movie" />} />
            <Route path="tv" element={<HomePage key="tv" />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
