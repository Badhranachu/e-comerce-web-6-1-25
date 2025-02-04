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

          
  
        if (productIndex !== -1) {
          return { alreadyInCart: true, productName };
        }
  
        await db.get().collection(collection.CART_COLLECTION).updateOne(
          { userId: userId },
          {
            $push: {
              products: {
                productId: productId,
                productName,
                quantity: 1,
              },
            },  
          }
        );
  
        return { addedToCart: true, productName };
      } else {
        await db.get().collection(collection.CART_COLLECTION).insertOne({
          userId: userId,
          products: [
            {
              productId: productId,
              productName,
              quantity: 1,
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

  
  
  getCartDetailsUsingId: async (userId) => {
    try {
        console.log("Searching for user cart with ID:", userId);

        const cart = await db
            .get()
            .collection(collection.CART_COLLECTION)
            .findOne({ userId: userId });

        if (!cart || !cart.products || cart.products.length === 0) {
            console.log("No cart found for user:", userId);
            return { products: [], totalPrice: 0 };  // Ensure it returns an object
        }

        // Calculate total price
        let totalPrice = 0;
        for (let item of cart.products) {
            const product = await db
                .get()
                .collection(collection.PRODUCT_COLLECTION)
                .findOne({ _id: new ObjectId(item.productId) });

            if (product) {
                totalPrice += (product.price || 0) * item.quantity;
            }
        }

        console.log("Cart found for user:", userId, cart.products);
        return { products: cart.products, totalPrice };
    } catch (error) {
        console.error("Error fetching cart details:", error);
        return { products: [], totalPrice: 0 }; // Return a proper object to prevent destructuring errors
    }
},
removeFromCart: async (userId, productId) => {
  try {
    const cart = await db.get().collection(collection.CART_COLLECTION).findOne({ userId: userId });

    if (cart) {
      // Filter out the product with the given productId from the cart
      const updatedProducts = cart.products.filter(item => item.productId.toString() !== productId);

      // If the product is not found, return false
      if (updatedProducts.length === cart.products.length) {
        return false; // Product not found in the cart
      }

      // Update the cart in the database
      await db.get().collection(collection.CART_COLLECTION).updateOne(
        { userId: userId },
        { $set: { products: updatedProducts } }
      );

      return true; // Product was removed successfully
    }

    return false; // Cart not found
  } catch (error) {
    console.error("Error removing product from cart:", error);
    throw new Error("Error removing product from cart");
  }
},

};
