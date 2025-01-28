const { ObjectId } = require('mongodb');
const db = require('../config/connection'); // Assuming `db` is your database connection module
const collection = require('../config/collections'); // Assuming `collection` has the collection names

module.exports = {
  // Fetch the user's cart
  getUserCartWithDetails: async (userId) => {
    try {
      const cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ 'userId._id': userId });

      if (!cart || !cart.products || !cart.products.length) {
        return { products: [], cart: null, totalPrice: 0 };
      }

      const productIds = cart.products.map((item) => new ObjectId(item.productId));

      const products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ _id: { $in: productIds } })
        .toArray();

      let totalPrice = 0;
      const cartProducts = products.map((product) => {
        const cartItem = cart.products.find(
          (item) => item.productId === product._id.toString()
        );
        const total = product.price * cartItem.quantity;
        totalPrice += total;

        return {
          ...product,
          quantity: cartItem.quantity,
          total,
          imagePath: product.imagePath || '/default-image.jpg',
        };
      });

      return { products: cartProducts, cart, totalPrice };
    } catch (error) {
      console.error('Error fetching user cart with details:', error);
      throw error;
    }
  },

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

  // Remove a product from the user's cart
  removeProductFromCart: async (userId, productId) => {
    try {
      // Update the cart by pulling the product with the given productId
      const result = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { userId: userId },
          { $pull: { products: { productId: productId } } }
        );

      // Check if the cart has any products left
      const cart = await db.get().collection(collection.CART_COLLECTION).findOne({ userId: userId });

      if (!cart || !cart.products || !cart.products.length) {
        // If the cart is empty after removal, delete the cart document
        await db.get().collection(collection.CART_COLLECTION).deleteOne({ userId: userId });
        return { cartEmptied: true };
      }

      return { removed: true };
    } catch (error) {
      console.error('Error removing product from cart:', error);
      throw error;
    }
  },
};
