import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FinanceApp from './login'; // On pointe vers le nouveau nom exporté
import ResetPassword from './ResetPassword';

function App() {
  // Le code ici doit être minimal : juste la navigation
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FinanceApp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;