const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Ensure this matches your User model
    required: true,
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product', // Ensure this matches your Product model
        required: true,
      },
      addedAt: {
        type: Date,
        default: Date.now, // Store the time the product was added
      },
    },
  ],
});

module.exports = mongoose.model('Wishlist', wishlistSchema);
