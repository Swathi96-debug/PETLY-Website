import React, { useState, useEffect } from 'react';
import { uploadAPI } from '../../services/api';

const ProductImage = ({ product, className = '', emojiClassName = 'text-8xl' }) => {
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadError(false);

    // If product directly provides a presigned or static imageUrl
    if (product?.imageUrl) {
      setImageUrl(product.imageUrl);
      return;
    }

    // If product.image is a direct URL or local asset path
    if (
      typeof product?.image === 'string' &&
      (product.image.startsWith('http://') ||
       product.image.startsWith('https://') ||
       product.image.startsWith('/') ||
       product.image.startsWith('data:image/'))
    ) {
      setImageUrl(product.image);
      return;
    }

    // If product has an S3 imageKey, request presigned URL
    if (product?.imageKey) {
      uploadAPI.getPresignedUrl(product.imageKey)
        .then((res) => {
          const url = res?.presignedUrl || res?.url;
          if (isMounted && url) {
            setImageUrl(url);
          }
        })
        .catch(() => {
          if (isMounted) setLoadError(true);
        });
    } else {
      setImageUrl(null);
    }

    return () => {
      isMounted = false;
    };
  }, [product?.imageKey, product?.imageUrl, product?.image]);

  if (imageUrl && !loadError) {
    return (
      <img
        src={imageUrl}
        alt={product?.name || 'Product'}
        onError={() => setLoadError(true)}
        className={`w-full h-full object-cover transition-transform duration-700 ${className}`}
      />
    );
  }

  // Fallback to emoji
  return (
    <span className={`transition-transform duration-700 select-none ${emojiClassName}`}>
      {product?.image && !product.image.startsWith('http') && !product.image.startsWith('/') ? product.image : '📦'}
    </span>
  );
};

export default ProductImage;
