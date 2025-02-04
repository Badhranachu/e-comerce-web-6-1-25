const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  imagePath: { type: String },
  isActive: { type: Boolean, default: true }, // Default to Active
});

module.exports = mongoose.model('Product', productSchema);
