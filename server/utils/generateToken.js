import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'petly_fallback_jwt_secret', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

export default generateToken;
