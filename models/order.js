const mongoose = require('mongoose');

// Order Schema
const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to User model
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product', // Reference to Product model
    required: true,
  },
  productName: String,
  totalPrice: Number,
  paymentMethod: String,
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Shipped', 'Delivered'],
    default: 'Pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create the Order model
const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
