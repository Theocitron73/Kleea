import { useState, useEffect } from 'react';
import DashboardSkeleton from './DashboardSkeleton';

function DelayedDashboardLoader({ loading, userTheme, filters, children }) {
  const [showSkeleton, setShowSkeleton] = useState(loading);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      // Lance le fondu sortant du squelette
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setShowSkeleton(false);
      }, 300); // Durée de la transition en millisecondes
      return () => clearTimeout(timer);
    } else {
      setShowSkeleton(true);
      setIsFadingOut(false);
    }
  }, [loading]);

  return (
    <div className="relative w-full h-full">
      {/* Le vrai dashboard est monté en arrière-plan pour que Recharts et le DOM se calent instantanément */}
      <div className={`w-full h-full transition-opacity duration-300 ${showSkeleton ? 'opacity-0 absolute inset-0 pointer-events-none' : 'opacity-100 relative'}`}>
        {children}
      </div>

      {/* Le squelette par-dessus qui s'efface doucement */}
      {showSkeleton && (
        <div className={`absolute inset-0 z-50 bg-[var(--bg-site)] transition-opacity duration-300 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
          <DashboardSkeleton userTheme={userTheme} filters={filters} />
        </div>
      )}
    </div>
  );
}

export default DelayedDashboardLoader;
