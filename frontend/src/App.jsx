import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FinanceApp from './login'; 
import ResetPassword from './ResetPassword';
import SharedTricount from './SharedTricount'; // 💡 Nouveau composant autonome
import PublicGuide from './PublicGuide'; // 💡 Import de la vue d'aide publique
import { MentionsLegales, PolitiqueConfidentialite } from './PagesLegales';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FinanceApp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* 💡 Route d'accès direct sans être connecté */}
        <Route path="/shared-tricount/:token" element={<SharedTricount />} />
         {/* 💡 URL personnalisée et partageable pour votre guide */}
        <Route path="/guide" element={<PublicGuide />} />
        <Route path="/mentions-legales" element={<MentionsLegales />} />
        <Route path="/confidentialite" element={<PolitiqueConfidentialite />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;