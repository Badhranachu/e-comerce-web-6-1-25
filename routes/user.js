var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/product-helpers');
const wishlistHelpers = require('../helpers/cart-helpers');
const mongoose = require('mongoose'); // Import mongoose
const db = require('../config/connection');
const collection = require('../config/collections');
const productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers')
const { ObjectId } = require('mongodb');
const cartHelpers = require('../helpers/cart-helpers');
const Order = require('../models/order'); // Import the Order model
const moment = require('moment'); // Import moment.js






// Middleware to ensure the user is authenticated (alternative name for consistency)
function ensureAuthenticated(req, res, next) {
  if (req.session.loggedIn) {
    return next();
  } else {
    res.redirect('/login');
  }
}

// Combined route for /view-products
router.get('/view-products', ensureAuthenticated, async (req, res) => {
  try {
    // Fetch the logged-in user from the session
    const user = req.session.user;
    console.log("User from session:", user);

    // Fetch all products using the productHelper or directly from the database
    const products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray();

    // Check for a success message or error message in the query parameters
    const successMessage = req.query.successMessage || null;
    const errorMessage = req.query.errorMessage || null;

    // Render the view-products page with products, user data, and success/error messages
    res.render('user/view-products', {
      products: products,
      user: user,
      successMessage: successMessage,
      errorMessage: errorMessage,
      admin: false, // Set admin flag to false for non-admin users
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).send("Internal Server Error");
  }
});

// Login page
// user.js
// GET /login route
router.get('/login', async (req, res) => {
  console.log("entered to login");

  if (req.session.loggedIn) {
    try {
      let user = req.session.user; // Get user details from session
      let products = await productHelper.getAllProducts(); // Fetch all products from the DB
      res.render('user/view-products', { products, user }); // Pass the logged-in user data
    } catch (error) {
      console.error('Error fetching products:', error);
      res.redirect('/'); // Redirect to home or error page in case of error
    }
  } else {
    const loginErr = req.session.loginErr || false; // Check if there was a login error
    req.session.loginErr = false; // Reset the error flag after rendering the page
    res.render('user/userlogin', { loginErr }); // Render login page and pass the login error flag
  }
});

// POST /login route
// POST Route for Login
router.post('/login', async (req, res) => {
  try {
    const response = await userHelpers.doLogin(req.body); // Call doLogin
    if (response.status) {
      req.session.loggedIn = true;
      req.session.user = response.user;
      req.session.userId = response.user._id;
      req.session.user = user;  // Store full user object
      req.session.userId = user._id; 

      console.log("Login successful:", req.session.user); // Debug session data

      res.redirect('/');
    }
  } catch (error) {
    console.error("Login error:", error);
    req.session.loginErr = error; // Store error message in session
    res.redirect('/login'); // Redirect to login
  }
});


// GET Route for Homepage
router.get('/', async (req, res) => {
  try {
    if (req.session.loggedIn) {
      let user = req.session.user;
      let products = await productHelper.getVisibleProducts(); // Fetch products with quantity

      // Log product names and quantities
      console.log("Fetched Products:");
      products.forEach(product => {
        console.log(`Name: ${product.name}, Quantity: ${product.quantity}`);
      });

      res.render('user/view-products', { 
        products, 
        user,
      });
    } else {
      res.render('user/view-products', { 
        products: [], 
        user: null,
      });
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    res.redirect('/');
  }
});











// Signup page
router.get('/signup', (req, res) => {
  res.render('user/usersignup');
});

// Signup POST route
router.post('/signup', (req, res) => {
  const userData = req.body;
  const image = req.files?.ProfilePicture;

  try {
    // Validate user data
    if (!userData.Name || !userData.Email) {
      return res.status(400).send('Name and Email are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.Email)) {
      return res.status(400).send('Invalid email format');
    }

    // Check if passwords match
    if (userData.Password !== userData.ConfirmPassword) {
      return res.status(400).send('Passwords do not match');
    }

    // Call DoSignup helper
    userHelpers.DoSignup(userData, image)
      .then((userId) => {
        console.log('Signup successful:', userId);
        res.redirect('/login');
      })
      .catch((error) => {
        console.error('Signup error:', error);
        res.status(400).send('Signup failed: ' + error);
      });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).send('An unexpected error occurred');
  }
});


router.get("/edit-user",(req,res)=>{
  res.send("edit user")
})
// Login POST route

// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});


//this below code should in the admin.js 
router.get("/all-users", (req, res) => {
  userHelpers.getAllUsers()
    .then((users) => {
      console.log("Users with plain passwords:", users); // Debug log
      res.render("admin/all-users", { admin: true, users }); // Pass users with plain passwords
    })
    .catch((error) => {
      console.error("Error rendering users:", error);
      res.status(500).send("Internal Server Error");
    });
});




router.get('/profile', async (req, res) => {
  try {
    const userId = req.session.userId; // Retrieve user ID directly from session

    if (!userId) {
      console.error('No user ID found in session');
      return res.redirect('/login'); // Redirect to login if the user is not logged in
    }

    // Fetch user details from the database
    const user = await db
      .get()
      .collection(collection.USER_COLLECTION)
      .findOne({ _id: new ObjectId(userId) });

    if (user) {
      console.log("Fetched user:", user); // Log the entire user object
      console.log("Image Path:", user.imagePath); // Log the image path

      // Render the profile page with user data
      res.render('user/profile', {
        user: {
          Name: user.Name,
          Email: user.Email,
          imagePath: user.imagePath || '/images/default-avatar.jpg', // Default avatar path
          DateOfBirth: user.DateOfBirth || 'Not provided', // Default if missing
          Age: user.Age || 'Not provided',                 // Default if missing
          Place: user.Place || 'Not provided',             // Default if missing
          Address: user.Address || 'No address provided',  // Default if missing
        },
      });
    } else {
      console.error('User not found in the database');
      res.redirect('/login'); // Redirect to login if the user is not found
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.redirect('/login'); // Redirect to login in case of any error
  }
});


router.post('/addtocart', async (req, res) => {
  try {
    // Fetch userId and product details from the session and request body
    const userId = req.session.userId;  // Ensure session userId is set correctly
    const { productId, productName } = req.body;

    // Log the userId and request body for debugging purposes
    console.log("User ID in addtocart:", userId);
    console.log("Request Body:", req.body);

    // Check if all necessary parameters are provided
    if (!userId || !productId || !productName) {
      return res.status(400).json({ error: "User, Product ID, and product name are required" });
    }

    // Call the cart helper to add the product to the user's cart
    const result = await cartHelpers.addProductToCart(userId, productId, productName);

    // Check the result and redirect accordingly
    if (result.alreadyInCart) {
      return res.redirect(
        `/view-products?successMessage=${encodeURIComponent(
          `${result.productName} is already in your cart.`
        )}`
      );
    } else if (result.addedToCart) {
      return res.redirect(
        `/view-products?successMessage=${encodeURIComponent(
          `${result.productName} added to cart successfully.`
        )}`
      );
    } else {
      return res.redirect('/view-products?errorMessage=Something went wrong');
    }
  } catch (error) {
    console.error('Error adding product to cart:', error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});





// GET /cart - Display user's cart
router.get('/cart', async (req, res) => {
  if (!req.session.user) {
    console.log("User not logged in. Redirecting to login.");
    return res.redirect('/login');
  }

  const userId = req.session.user._id;
  console.log("User ID of cart:", userId);

  try {
    const cartDetails = await cartHelpers.getCartDetailsUsingId(userId);
    const cartItems = cartDetails.products;
    let totalPrice = 0;

    // Enhance cartItems with product details (price, total, image path)
    for (let item of cartItems) {
      const product = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: new ObjectId(item.productId) });

      if (product) {
        item.price = product.price; // Add price
        item.total = item.price * item.quantity; // Calculate total for product
        item.imagePath = product.imagePath; // Add image
        totalPrice += item.total; // Add to overall total price
      }
    }

    console.log("Cart products:", cartItems);
    console.log("Total price:", totalPrice);

    const message = req.query.message || ''; // Get message from query string

    res.render('user/cart', {
      user: req.session.user,
      cartItems,
      totalPrice,
      admin: false,
      message, // Pass message to view
    });
  } catch (error) {
    console.error("Error fetching cart details:", error);
    res.status(500).send("Error fetching cart items");
  }
});

router.get('/cart-remove', async (req, res) => {
  res.send("cart remove")
});


















// Proceed to Payment
// router.post("/cart/payment", async (req, res) => {
//   try {
//     // Log received cart details
//     console.log("Received cartDetails:", req.body.cartDetails);

//     // Parse cart details from request body
//     const cartDetails = JSON.parse(req.body.cartDetails);

//     // Calculate the total price
//     const totalPrice = cartDetails.reduce(
//       (sum, product) => sum + product.price * product.quantity,
//       0
//     );

//     // Fetch the user's details (from session or database)
//     const user = req.session.user;

//     // Render the payment page, passing the cart details, total price, and user details
//     res.render("user/payment", {
//       cartDetails,
//       totalPrice,
//       user,
//     });
//   } catch (error) {
//     console.error("Error processing payment data:", error);
//     res.status(500).send("An error occurred during payment processing");
//   }
// });



router.get('/each-product/:id', async (req, res) => {
  console.log(req.body)
  try {
    const productId = req.params.id;
    console.log("each productid"+productId);

    // Validate Product ID format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).send('Invalid Product ID');
    }

    const product = await productHelpers.getProductById(productId);

    if (product) {
      const user = req.session.user || req.user;
      const successMessage = req.session.successMessage || null;
      req.session.successMessage = null; // Clear message after use

      res.render('user/each-product', {
        product,
        user,
        successMessage,
        admin: false,
        productId: productId,
      });
    } else {
      res.status(404).render('user/not-found', {
        message: 'Product not found!',
        user: req.session.user || null,
      });
    }
  } catch (error) {
    console.error(`Error fetching product with ID ${req.params.id}:`, error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/buy/:productId', async (req, res) => {
  try {
    const userId = req.session.userId;
    console.log("User ID in buy:", userId);

    if (!userId) {
      return res.redirect('/login');
    }

    const productId = req.params.productId;

    // Validate the product ID
    if (!ObjectId.isValid(productId)) {
      return res.status(400).send('Invalid product ID.');
    }

    // Fetch product details from the database
    const product = await db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .findOne({ _id: new ObjectId(productId) });

    if (!product) {
      return res.status(404).send('Product not found.');
    }

    // Fetch all user details using userId
    const user = await db
      .get()
      .collection(collection.USER_COLLECTION)
      .findOne({ _id: new ObjectId(userId) });

    if (!user) {
      console.error(`User not found for session user ID: ${userId}`);
      return res.status(404).send('User not found.');
    }

    // Pass the complete user details and product details to the render function
    res.render('user/buy', {
      user: {
        ...user, // Pass all user details directly
        imagePath: user.imagePath || '/images/default-avatar.jpg', // Fallback for image path
      },
      product: {
        ...product,
        price: product.price || 0, // Ensure price is available
      },
      quantity: 1, // Default quantity
      totalPrice: product.price || 0, // Default total price
      admin: false,
    });
  } catch (error) {
    console.error('Error fetching buy page:', error);
    res.status(500).send('Internal Server Error');
  }
});




router.post("/payment", async (req, res) => {
  try {
    // Check if the request is coming from the cart (cartDetails exists)
    if (req.body.cartDetails) {
      console.log("/payment cartDetails (raw):", req.body.cartDetails);
      let cartDetails;
      try {
        // Parse the cartDetails field
        cartDetails = JSON.parse(req.body.cartDetails);

        let totalPrice = 0;
        // Calculate the total price from the cart details
        cartDetails.forEach(item => {
          totalPrice += item.total;  // Add the total of each item in the cart
        });

        console.log("/payment cartDetails (parsed):", cartDetails);
        console.log("totalPrice: ", totalPrice);

        // Render the payment page for multiple products
        return res.render("user/cart-bill", {
          cartDetails,
          totalPrice,
          user: req.session.user, // Pass user details if available
        });

      } catch (error) {
        return res.status(400).send("Invalid cart details format");
      }

    } else {
      // If it's not from the cart, handle a single product order
      const { productId, productName, productPrice, quantity, totalPrice } = req.body;

      const requiredFields = ["productId", "productName", "productPrice", "quantity", "totalPrice"];
      for (const field of requiredFields) {
        if (!req.body[field]) {
          return res.status(400).send(`Missing required field: ${field}`);
        }
      }

      // Render the payment page for a single product
      res.render("user/payment", {
        isMultiple: false,
        product: {
          id: productId,
          name: productName,
          price: parseFloat(productPrice),
        },
        quantity: parseInt(quantity, 10),
        totalPrice: parseFloat(totalPrice),
        user: req.session.user,
      });
    }
  } catch (error) {
    console.error("Error in payment route:", error.message);
    res.status(500).send("An error occurred during payment processing");
  }
});










router.post('/confirm-payment', async (req, res) => {
  try {
    // Log the incoming request body to inspect the data
    console.log('Received Request Body:', req.body);

    // If it's a single product order
    if (!req.body.cartDetails) {
      const { paymentMethod, productId, productName, totalPrice, quantity } = req.body;

      // Log the productId before validating it
      console.log('Received Product ID:', productId);

      // Validate the productId for MongoDB ObjectId format
      if (!ObjectId.isValid(productId)) {
        console.error('Invalid Product ID:', productId);
        return res.status(400).send('Invalid product ID');
      }

      // Fetch the product details
      const product = await productHelpers.getProductById(productId);

      // Render the confirmation page for a single product
      res.render('user/confirm-payment', {
        paymentMethod,
        isMultiple: false,
        product: {
          name: product.name,
          id: product._id,
          price: totalPrice,
          image: product.imagePath,  // Fetch the image path from the product data
        },
        totalPrice,
        quantity,
        user: req.session.user,
      });
    }
  } catch (error) {
    console.error('Error in confirm-payment route:', error.message);
    res.status(500).send('An error occurred during payment confirmation');
  }
});













router.post('/confirmed', async (req, res) => {
  try {
    const { productId, productName, totalPrice, quantity, paymentMethod } = req.body;

    console.log("Product ID received in /confirmed:", productId);

    // Validate `productId`
    if (!ObjectId.isValid(productId)) {
      console.error('Invalid Product ID:', productId);
      return res.status(400).send('Invalid product ID');
    }

    // Fetch product details using productHelpers
    const product = await productHelpers.getProductById(productId);

    if (!product) {
      console.error('Product not found for ID:', productId);
      return res.status(404).send('Product not found');
    }

    console.log('Product details fetched:', product);

    // Check if there is enough quantity available
    if (product.quantity < quantity) {
      console.error('Not enough quantity for product ID:', productId);
      return res.render('user/confirmed', {
        errorMessage: 'Not enough quantity available',
        availableQuantity: product.quantity, // Show available quantity
        productName: product.name || productName,
        productImage: product.imagePath || `/images/products/default.jpg`,
        quantity,
        totalPrice,
        paymentMethod,
        user: req.session.user,
        productId: productId
      });
    }

    // Construct product image path
    const productImage = product.imagePath || `/images/products/default.jpg`;

    // Create an order object
    const order = {
      productId: new ObjectId(productId),
      productName: product.name || productName,
      totalPrice,
      quantity,
      paymentMethod,
      userId: req.session.user._id,
      orderStatus: 'Pending',  // Initial status
      orderDate: new Date(),
      productImage,
    };

    console.log("User ID:", req.session.user._id);

    // Save the order to the database using productHelpers
    const orderId = await productHelpers.addOrder(order);

    // Update the status to 'Confirmed'
    await db.get()
      .collection(collection.ORDERS_COLLECTION)
      .updateOne(
        { _id: new ObjectId(orderId) },
        { $set: { orderStatus: 'Confirmed' } }  // Update status to 'Confirmed'
      );

    console.log('Order status updated to Confirmed');

    // Reduce the product quantity
    const updateResult = await productHelpers.reduceProductQuantity(productId, quantity);
    if (!updateResult) {
      console.error('Failed to update product quantity.');
      return res.status(500).send('Order confirmed, but quantity update failed.');
    }

    console.log('Product quantity updated successfully.');

    // Pass the order details to the confirmed view
    res.render('user/confirmed', {
      productName: product.name || productName,
      productImage,
      quantity,
      totalPrice,
      paymentMethod,
      product,
      user: req.session.user,
      productId: productId // Pass productId to the view
    });

  } catch (error) {
    console.error('Error in /confirmed route:', error);
    res.status(500).send('An error occurred while confirming the order.');
  }
});



//cart bill payment 
router.post('/cartbill-payment', (req, res) => {
  console.log("Cart Bill Payment Received:");

  console.log("Total Price:", req.body.totalPrice);
  console.log("Payment Method:", req.body.paymentMethod);

  // Parse cartDetails if it's a JSON string
  if (req.body.cartDetails) {
    try {
      const cartDetails = JSON.parse(req.body.cartDetails);
      console.log("Cart Details:", cartDetails);
    } catch (error) {
      console.error("Error parsing cartDetails:", error);
    }
  }

  // You can add more logic here to process the data or perform actions based on the cart details and total price.
});
























router.get('/orders', async (req, res) => {
  const userId = req.session.user ? req.session.user._id : null;  // Get userId from session
  console.log("userid in orders: " + userId);

  if (!userId) {
    return res.status(400).send('User not logged in.');
  }

  try {
    const orders = await productHelpers.getOrdersByUserId(userId);  // Fetch orders using helper function
    console.log('Orders found for user:', orders);

    // Loop through each order to fetch product details based on the productId
    for (const order of orders) {
      // Assuming `getProductById` is a function in your helpers to fetch product details
      const product = await productHelpers.getProductById(order.productId);
      console.log('Product for order:', product); // Log product details for each order      order.productDetails = product; // Add product details to the order
    }

    // Format order dates
    orders.forEach(order => {
      order.orderDateFormatted = moment(order.orderDate).format('MMMM Do YYYY, h:mm:ss a'); // Format date
    });

    // Render orders page with the product details included
    res.render('user/orders', { orders, user: req.session.user });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).send('Error fetching orders for the user.');
  }
});


















router.get('/test', (req, res) => {
  res.send("test");
});

module.exports = router;
