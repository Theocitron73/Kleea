import { useState, useEffect, useRef } from 'react';

// Carrousel des cartes de comptes.
export default function useCarrousel({ budgetGauges }) {
  const carouselRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOverflowing, setIsOverflowing] = useState(false); // <-- Pour savoir si ça déborde
  const [totalDots, setTotalDots] = useState(1);
  const itemsPerPage = 5;

  // Détecte si le contenu déborde réellement de l'écran
  useEffect(() => {
    const container = carouselRef.current;
    if (!container || budgetGauges.length === 0) return;

    const checkOverflow = () => {
      const hasOverflow = container.scrollWidth > container.clientWidth;
      setIsOverflowing(hasOverflow);
      
      if (hasOverflow) {
        setTotalDots(Math.ceil(budgetGauges.length / itemsPerPage));
      } else {
        setTotalDots(1);
        setActiveIndex(0);
      }
    };

    // On vérifie tout de suite
    checkOverflow();

    // On écoute les changements de taille de l'écran (ex: passage de mobile à desktop)
    const resizeObserver = new ResizeObserver(() => checkOverflow());
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [budgetGauges]);

  const handleScroll = (e) => {
    if (!isOverflowing) return;
    const container = e.target;
    const scrollLeft = container.scrollLeft;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    if (maxScrollLeft <= 0) return;

    const percentage = scrollLeft / maxScrollLeft;
    const index = Math.min(Math.round(percentage * (totalDots - 1)), totalDots - 1);
    setActiveIndex(index);
  };

  const navigateCarousel = (direction) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const scrollAmount = container.clientWidth * 0.8; 
    
    container.scrollBy({
      left: direction === 'next' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  };

  const scrollToPage = (pageIndex) => {
    if (!carouselRef.current || totalDots <= 1) return;
    const container = carouselRef.current;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    const targetScroll = (pageIndex / (totalDots - 1)) * maxScrollLeft;
    
    container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    setActiveIndex(pageIndex);
  };

  return { activeIndex, carouselRef, handleScroll, navigateCarousel, scrollToPage, totalDots };
}
