var db = require('../config/connection');
var collection = require('../config/collections');
const path = require('path');
const fs = require('fs');
// const db = require('../db'); // Adjust based on the location of `db.js`
const { ObjectId } = require('mongodb');  // Ensure ObjectId is correctly imported




module.exports = {
  addProduct: (product, imageFile, callback) => {
    console.log("Entered to helper addProduct");

    // Insert the product into the database first (including stock and name)
    db.get()
      .collection(collection.PRODUCT_COLLECTION)
      .insertOne(product)
      .then((result) => {
        console.log('Product inserted with ID:', result.insertedId);

        // Generate the relative image path after insertion
        const relativeImagePath = `/product-images/${result.insertedId}.jpg`;

        // Save the image to the public directory
        const imagePath = path.join(__dirname, '..', 'public', 'product-images', `${result.insertedId}.jpg`);

        // Save the image file
        fs.writeFile(imagePath, imageFile.data, (err) => { // Assuming imageFile.data contains image buffer
          if (err) {
            console.error('Error saving image:', err);
            callback(null, null);  // Error while saving image
            return;
          }

          // Step 2: Update the product's image path in the database
          db.get()
            .collection(collection.PRODUCT_COLLECTION)
            .updateOne(
              { _id: result.insertedId },
              { $set: { imagePath: relativeImagePath } }
            )
            .then(() => {
              console.log('Image path updated for product:', result.insertedId, relativeImagePath);
              // Step 3: Return the inserted ID and image path via callback
              callback(result.insertedId, relativeImagePath);
            })
            .catch((err) => {
              console.error('Error updating image path in DB:', err);
              callback(null, null);  // Error updating image path in DB
            });
        });
      })
      .catch((err) => {
        console.error('Error inserting product:', err);
        callback(null, null);  // Error while inserting product
      });
  },


  getAllProducts: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .find()
        .toArray()
        .then((products) => resolve(products))
        .catch((err) => reject(err));
    });
  },
  deleteProduct: (productId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .deleteOne({ _id: new ObjectId(productId) })
        .then((response) => resolve(response))
        .catch((err) => reject(err));
    });
  },
  
  getProductById: async (productId) => {
    try {
      // Validate if productId is a valid ObjectId
      if (!ObjectId.isValid(productId)) {
        throw new Error('Invalid productId format');
      }

      // Fetch product details from the database
      const product = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: new ObjectId(productId) });

      return product;
    } catch (error) {
      console.error('Error in getProductById:', error);
      throw error; // Re-throw the error to handle it in the calling function
    }
  },
  updateProduct: (productId, updatedData, newImage) => {
    return new Promise((resolve, reject) => {
      const updateData = { ...updatedData }; // Spread updated data to include all fields
  
      // If a new image is provided, update the image path
      if (newImage) {
        const relativeImagePath = `/product-images/${productId}.jpg`;
        const imagePath = path.join(__dirname, '..', 'public', 'product-images', `${productId}.jpg`);
  
        // Save the new image
        fs.writeFile(imagePath, newImage.data, (err) => {
          if (err) {
            console.error('Error saving new image:', err);
            return reject(err);
          }
          updateData.imagePath = relativeImagePath; // Add the new image path to update
          proceedWithUpdate();
        });
      } else {
        proceedWithUpdate(); // Update without changing the image
      }
  
      function proceedWithUpdate() {
        db.get()
          .collection(collection.PRODUCT_COLLECTION)
          .updateOne(
            { _id: new ObjectId(productId) },
            { $set: updateData } // Only set fields provided in `updatedData`
          )
          .then((response) => resolve(response))
          .catch((err) => reject(err));
      }
    });
  },
  
  getVisibleProducts: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ isShown: true }, { projection: { name: 1, price: 1, imagePath: 1, quantity: 1 } }) // Include quantity
        .toArray()
        .then((products) => resolve(products))
        .catch((err) => reject(err));
    });
  },
  
  addOrder: (order) => {
    return new Promise((resolve, reject) => {
      db.get()
      .collection(collection.ORDERS_COLLECTION)  // Use the correct orders collection
      .insertOne(order)
        .then((result) => {
          console.log('Order inserted with ID:', result.insertedId);
          resolve(result.insertedId);  // Return the inserted order ID
        })
        .catch((err) => {
          console.error('Error inserting order:', err);
          reject(err);  // Reject the promise in case of an error
        });
    });
  },
  getOrdersByUserId: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDERS_COLLECTION)  // Correct collection for orders
        .find({ userId: userId })  // Query to find orders by userId
        .toArray()
        .then((orders) => {
          if (orders.length === 0) {
            reject('No orders found for this user.');
          } else {
            resolve(orders);  // Return the orders found for the user
          }
        })
        .catch((err) => {
          console.error('Error fetching orders:', err);
          reject(err);  // Reject the promise in case of an error
        });
    });
  },
  reduceProductQuantity: async (productId, quantity) => {
    try {
      const qty = parseInt(quantity, 10);
  
      // Reduce quantity
      const updateResult = await db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: new ObjectId(productId) },
          { $inc: { quantity: -qty } } // Reduce quantity by ordered amount
        );
  
      if (updateResult.modifiedCount === 0) {
        console.error('Failed to update product quantity for product ID:', productId);
        return false;
      }
  
      console.log(`Quantity reduced by ${qty} for product ID:`, productId);
      return true;
    } catch (error) {
      console.error('Error reducing product quantity:', error);
      return false;
    }
  },
  
  
  
  
  
    
};
