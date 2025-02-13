var express = require('express');
var router = express.Router();
const productHelper = require('../helpers/product-helpers');  // Keep this line and remove the other one
const fs = require('fs');
const path = require('path');
const { ObjectId } = require('mongodb');
const userHelper = require('../helpers/user-helpers');
const Category = require("../models/category"); // Import category model

// GET /admin/view-products
router.get('/', async (req, res) => {
  try {
    const products = await productHelper.getAllProducts();
    console.log("Products retrieved successfully:", products);
    res.render('admin/view-products', {
      products,
      deleteMessage: req.session.deleteMessage || null,
      admin: true, // Ensures admin-header is used
    });
    req.session.deleteMessage = null;
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).send('Internal Server Error');
  }
});

// GET /admin/add-products
router.get('/addproducts', (req, res) => {
  console.log("Tapped add products");
  res.render('admin/add-products', { admin: true }); // Renders the product form for the admin
});

// POST route to handle product addition (with name, stock, price, description, and image)
router.post('/addproducts', (req, res) => {
  const image = req.files.image; // Get the uploaded image
  const product = {
    name: req.body.name,  // Name of the product
    category: req.body.category,  
    quantity: parseInt(req.body.quantity),  // Stock quantity, converted to integer
    price: parseFloat(req.body.price),  // Price of the product, converted to float
    description: req.body.description,  // Product description
  };

  // Call the addProduct helper function to insert the product into the database
  productHelper.addProduct(product, image, (insertedId) => {
    if (insertedId) {
      res.redirect('/admin'); // Redirect to admin products page if the product was added successfully
    } else {
      res.status(500).send('Failed to add product.'); // Send error response if there was an issue adding the product
    }
  });
});


// Route to fetch categories from the database
router.get('/getcategories', async (req, res) => {
  try {
    const categories = await Category.find();  // Fetch categories from the database
    res.json({ success: true, categories: categories });  // Send categories as JSON response
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.json({ success: false, message: "Failed to fetch categories" });
  }
});

// Add Category
router.post("/addcategory", async (req, res) => {
  try {
    const { category } = req.body;

    if (!category) {
      return res.json({ success: false, message: "Category name is required" });
    }

    const existingCategory = await Category.findOne({ name: category });
    if (existingCategory) {
      return res.json({ success: false, message: "Category already exists" });
    }

    const newCategory = new Category({ name: category });
    await newCategory.save();

    console.log("Category added to DB:", newCategory); // Log added category
    res.json({ success: true, message: "Category added successfully", category: newCategory });
  } catch (error) {
    console.error("Error adding category:", error);
    res.json({ success: false, message: "Error adding category" });
  }
});


// Delete Product Route
router.get('/delete-product/:id', (req, res) => {
  const productId = req.params.id;

  productHelper.deleteProduct(productId)
    .then(() => {
      req.session.deleteMessage = 'Product deleted successfully!';
      res.redirect('/admin');
    })
    .catch((err) => {
      console.error('Error deleting product:', err);
      req.session.deleteMessage = 'Failed to delete product.';
      res.redirect('/admin');
    });
});

// Route to render the edit product page
router.get('/edit-product/:id', async (req, res) => {
  const productId = req.params.id;

  try {
    const product = await productHelper.getProductById(productId);
    if (!product) {
      return res.status(404).send('Product not found');
    }

    res.render('admin/edit-products', { product, admin: true });
    console.log('Product edit page entered');
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).send('Internal Server Error');
  }
});

// POST route to handle product update
router.post('/edit-product/:id', async (req, res) => {
  const productId = req.params.id;

  if (!ObjectId.isValid(productId)) {
    return res.status(400).send('Invalid Product ID');
  }

  const updatedData = {
    name: req.body.name,
    category: req.body.category,
    description: req.body.description,
    price: parseFloat(req.body.price),
    quantity: parseInt(req.body.quantity, 10),
    isActive: req.body.quantity > 0, // Auto-deactivate if stock is 0
  };

  const newImage = req.files?.image;

  try {
    const result = await productHelper.updateProduct(productId, updatedData, newImage);

    console.log(result.modifiedCount === 0 ? 'No changes made to the product.' : 'Product updated successfully.');

    res.redirect('/admin');
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Toggle Product Status
router.get('/toggle-status/:id', async (req, res) => {
  const productId = req.params.id;
  if (!ObjectId.isValid(productId)) {
    return res.status(400).send('Invalid product ID');
  }

  try {
    const product = await productHelper.getProductById(productId);
    if (!product) {
      return res.status(404).send('Product not found');
    }

    const updatedStatus = !product.isActive;
    await productHelper.updateProduct(productId, { isActive: updatedStatus });
    res.redirect('/admin');
  } catch (error) {
    console.error('Error toggling product status:', error);
    res.status(500).send('Error toggling status');
  }
});

// Toggle Show Route
router.get('/toggle-show/:id', async (req, res) => {
  const productId = req.params.id;

  if (!ObjectId.isValid(productId)) {
    return res.status(400).send('Invalid Product ID');
  }

  try {
    const product = await productHelper.getProductById(productId);

    if (!product) {
      return res.status(404).send('Product not found');
    }

    const updatedData = {
      isActive: product.quantity > 0, // Auto-deactivate if stock is 0
      isShown: !product.isShown, // Toggle visibility
    };

    await productHelper.updateProduct(productId, updatedData);

    console.log(`Product ${productId} visibility toggled. New status - isShown: ${updatedData.isShown}, isActive: ${updatedData.isActive}`);
    
    res.redirect('/admin');
  } catch (error) {
    console.error('Error toggling product visibility:', error);
    res.status(500).send('Error toggling product visibility');
  }
});

// Admin User Management Routes
router.get("/all-users", (req, res) => {
  userHelper.getAllUsers()
    .then((users) => {
      console.log("Users with plain passwords:", users); // Debug log
      res.render("admin/all-users", { admin: true, users }); // Pass users with plain passwords
    })
    .catch((error) => {
      console.error("Error rendering users:", error);
      res.status(500).send("Internal Server Error");
    });
});

// Delete User Route
router.post('/delete-user', async (req, res) => {
  try {
    const userId = req.body.userId;
    if (!userId) throw new Error('User ID not provided');

    const result = await userHelper.deleteUser(userId);
    if (result) {
      console.log('User deleted successfully:', userId);
      res.json({ status: true, message: 'User deleted successfully' });
    } else {
      throw new Error('Failed to delete user');
    }
  } catch (error) {
    console.error('Error deleting user:', error.message);
    res.json({ status: false, message: error.message });
  }
});

module.exports = router;
