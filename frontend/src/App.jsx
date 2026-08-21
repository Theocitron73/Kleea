import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FinanceApp from './login'; 
import ResetPassword from './ResetPassword';
import SharedTricount from './SharedTricount'; // 💡 Nouveau composant autonome

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FinanceApp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* 💡 Route d'accès direct sans être connecté */}
        <Route path="/shared-tricount/:token" element={<SharedTricount />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;