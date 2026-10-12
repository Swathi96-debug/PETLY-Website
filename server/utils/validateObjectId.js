import mongoose from 'mongoose';

/**
 * Validates whether the given ID is a valid MongoDB ObjectId.
 * @param {string} id
 * @returns {boolean}
 */
export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && new mongoose.Types.ObjectId(id).toString() === id;
};

export default isValidObjectId;
