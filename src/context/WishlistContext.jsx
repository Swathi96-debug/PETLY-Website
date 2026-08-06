import React, { createContext, useContext } from 'react';
import { useEcosystem } from './EcosystemContext';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const { wishlistPets, wishlistProducts, toggleWishlistPet, toggleWishlistProduct } = useEcosystem();
  return (
    <WishlistContext.Provider value={{ wishlistPets, wishlistProducts, toggleWishlistPet, toggleWishlistProduct }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
