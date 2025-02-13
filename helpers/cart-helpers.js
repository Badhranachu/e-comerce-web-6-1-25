const db = require('../config/connection'); // Assuming `db` is your database connection module
const collection = require('../config/collections'); // Assuming `collection` has the collection names
const { ObjectId } = require('mongodb');

module.exports = {

  // Add a product to the user's cart
  addProductToCart: async (userId, productId, productName) => {
    try {
      const cart = await db.get().collection(collection.CART_COLLECTION).findOne({ userId: userId });

      if (cart) {
        const productIndex = cart.products.findIndex(
          (product) => product.productId.toString() === productId
        );

        // If the product is already in the cart, return an appropriate response
        if (productIndex !== -1) {
          return { alreadyInCart: true, productName };
        }

        // Otherwise, add the product to the cart
        await db.get().collection(collection.CART_COLLECTION).updateOne(
          { userId: userId },
          {
            $push: {
              products: {
                productId: productId,
                productName,
                quantity: 1, // Add default quantity as 1
              },
            },
          }
        );

        return { addedToCart: true, productName };
      } else {
        // If no cart exists for the user, create a new one and add the product
        await db.get().collection(collection.CART_COLLECTION).insertOne({
          userId: userId,
          products: [
            {
              productId: productId,
              productName,
              quantity: 1, // Add default quantity as 1
            },
          ],
        });

        return { addedToCart: true, productName };
      }
    } catch (error) {
      console.error('Error adding product to cart:', error);
      throw error;
    }
  },

  // Get cart details for a user
  getCartDetailsUsingId: async (userId) => {
    try {
      console.log("Fetching cart details for user:", userId);

      // Fetch the user's cart
      const cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ userId: userId });

      if (!cart || !cart.products || cart.products.length === 0) {
        console.log("Cart is empty for user:", userId);
        return { products: [], totalPrice: 0 };
      }

      // Get all product IDs from the cart
      const productIds = cart.products.map(item => new ObjectId(item.productId));

      // Fetch full product details for the items in the cart
      const products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ _id: { $in: productIds } })
        .toArray();

      // Map the fetched products with cart details (including quantity)
      let totalPrice = 0;
      const cartItems = cart.products.map(cartItem => {
        const product = products.find(prod => prod._id.toString() === cartItem.productId);
        if (product) {
          const itemTotal = product.price * cartItem.quantity;
          totalPrice += itemTotal;

          return {
            _id: product._id,
            name: product.name,
            price: product.price,
            image: product.imagePath, // Assuming the product has an image field
            quantity: cartItem.quantity,
            total: itemTotal, // Individual item total price
          };
        }
        return null; // Handle cases where the product is deleted from DB
      }).filter(item => item !== null); // Remove any null values

      console.log("Cart items:", cartItems);

      return { products: cartItems, totalPrice };
    } catch (error) {
      console.error("Error fetching cart details:", error);
      return { products: [], totalPrice: 0 };
    }
  },
    


};
