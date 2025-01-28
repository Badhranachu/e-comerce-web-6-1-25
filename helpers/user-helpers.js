  var db = require('../config/connection');
  var collection = require('../config/collections');
  const bcrypt = require('bcrypt');
  const path = require('path');
  const fs = require('fs');
  const { ObjectId } = require('mongodb');




  module.exports = {
    DoSignup: (userData, imageFile) => {
      return new Promise((resolve, reject) => {
        bcrypt.hash(userData.Password, 10, (hashError, hashedPassword) => {
          if (hashError) {
            console.error('Error hashing password:', hashError);
            return reject('Failed to hash password');
          }
    
          const newUser = {
            Name: userData.Name,
            Email: userData.Email.toLowerCase(),
            PhoneNumber: userData.PhoneNumber, // Add PhoneNumber here
            HashedPassword: hashedPassword,
            DateOfBirth: userData.DateOfBirth || null,
            Age: userData.Age || null,
            Place: userData.Place || null,
            Address: userData.Address || null,
            AdditionalInfo: userData.AdditionalInfo || null,
          };
    
          db.get()
            .collection(collection.USER_COLLECTION)
            .insertOne(newUser)
            .then((result) => {
              const userId = result.insertedId.toString();
    
              if (imageFile) {
                const imageDir = path.join(__dirname, '..', 'public', 'profile-images');
                if (!fs.existsSync(imageDir)) {
                  fs.mkdirSync(imageDir, { recursive: true });
                }
    
                const relativeImagePath = `/profile-images/${userId}.jpg`;
                const imagePath = path.join(imageDir, `${userId}.jpg`);
    
                fs.writeFile(imagePath, imageFile.data, (fileError) => {
                  if (fileError) {
                    console.error('Error saving image file:', fileError);
                    return reject('Failed to save profile picture');
                  }
    
                  db.get()
                    .collection(collection.USER_COLLECTION)
                    .updateOne(
                      { _id: result.insertedId },
                      { $set: { imagePath: relativeImagePath } }
                    )
                    .then(() => {
                      resolve(userId);
                    })
                    .catch((dbError) => {
                      reject('Failed to update user with image path');
                    });
                });
              } else {
                resolve(userId);
              }
            })
            .catch((dbError) => {
              reject('Failed to insert user into the database');
            });
        });
      });
    },    
    doLogin: (userData) => {
      return new Promise(async (resolve, reject) => {
        try {
          let response = {};
          userData.Email = userData.Email.toLowerCase(); // Normalize email for consistent matching
    
          // Fetch user from database
          let user = await db
            .get()
            .collection(collection.USER_COLLECTION)
            .findOne({ Email: userData.Email });
    
          if (user) {
            // Compare provided password with stored hashed password
            const match = await bcrypt.compare(userData.Password, user.HashedPassword);
            if (match) {
              response.user = {
                _id: user._id, // Use _id to remain consistent
                Name: user.Name,
                Email: user.Email,
                imagePath: user.imagePath || '/images/default-avatar.jpg', // Fallback for imagePath
              };
              response.status = true;
              resolve(response);
            } else {
              reject("Invalid email or password"); // Password mismatch
            }
          } else {
            reject("Invalid email or password"); // No user found
          }
        } catch (error) {
          console.error("Login error:", error);
          reject("An error occurred during login"); // Generic error message
        }
      });
    },
    
        getAllProducts: () => {
          return new Promise((resolve, reject) => {
            db.get()
              .collection(collection.PRODUCT_COLLECTION)
              .find()
              .toArray()  // Convert the cursor to an array
              .then((products) => resolve(products))
              .catch((err) => reject(err));
          });
        },
        getAllUsers: () => {
          return new Promise((resolve, reject) => {
            db.get()
              .collection(collection.USER_COLLECTION)
              .find() // Fetch all user documents
              .toArray() // Convert the cursor to an array
              .then((users) => {
                console.log("Fetched users:", users); // Debug log
                resolve(users);
              })
              .catch((error) => {
                console.error("Error fetching users:", error.message);
                reject("Failed to fetch users");
              });
          });
        },
        // getAllUsers: () => {
        //   return new Promise((resolve, reject) => {
        //     db.get()
        //       .collection(collection.USER_COLLECTION)
        //       .find()
        //       .project({ Name: 1, Email: 1, PlainPassword: 1 }) // Include PlainPassword
        //       .toArray()
        //       .then((users) => {
        //         console.log("Fetched users with plain password:", users); // Debug log
        //         resolve(users);
        //       })
        //       .catch((error) => {
        //         console.error("Error fetching users:", error.message);
        //         reject("Failed to fetch users");
        //       });
        //   });
        // },
        deleteUser: (userId) => {
          return new Promise(async (resolve, reject) => {
            try {
              const result = await db
                .get()
                .collection(collection.USER_COLLECTION)
                .deleteOne({ _id: new ObjectId(userId) }); // Delete the user by ID
              if (result.deletedCount > 0) {
                console.log('User deleted from database:', userId);
                resolve(true);
              } else {
                console.log('User not found or already deleted:', userId);
                resolve(false);
              }
            } catch (error) {
              console.error('Error deleting user from database:', error.message);
              reject(error);
            }
          });
        },
        getUserProfile: (userId) => {
          return new Promise((resolve, reject) => {
            db.get()
              .collection(collection.USER_COLLECTION)
              .findOne({ _id: new ObjectId(userId) })
              .then((user) => {
                if (user) {
                  resolve(user);
                } else {
                  reject("User not found");
                }
              })
              .catch((error) => {
                console.error("Error fetching user by ID:", error.message);
                reject("Failed to fetch user");
              });
          });
        },
        

        addToCart: async (req, res) => {
          try {
            const userId = req.session.user._id; // Assuming the user is logged in and their ID is stored in session
            const productId = req.query.productId; // Get the product ID from the query parameter
        
            if (!userId) {
              return res.status(400).json({ error: "User not logged in" });
            }
        
            if (!productId) {
              return res.status(400).json({ error: "Product ID is required" });
            }
        
            // Check if the user already has a cart document
            const cart = await db.get()
              .collection(collection.CART_COLLECTION)
              .findOne({ userId: new ObjectId(userId) });
        
            // If the cart exists, update the cart by adding the product ID
            if (cart) {
              // Check if the product is already in the cart
              const productIndex = cart.products.findIndex(product => product.productId.toString() === productId);
              if (productIndex !== -1) {
                // Product already exists in cart, increase the quantity
                await db.get()
                  .collection(collection.CART_COLLECTION)
                  .updateOne(
                    { userId: new ObjectId(userId), "products.productId": new ObjectId(productId) },
                    { $inc: { "products.$.quantity": 1 } }
                  );
              } else {
                // Add the product to the cart if it does not already exist
                await db.get()
                  .collection(collection.CART_COLLECTION)
                  .updateOne(
                    { userId: new ObjectId(userId) },
                    { $push: { products: { productId: new ObjectId(productId), quantity: 1 } } }
                  );
              }
            } else {
              // If no cart exists, create a new cart with the product ID
              await db.get()
                .collection(collection.CART_COLLECTION)
                .insertOne({
                  userId: new ObjectId(userId),
                  products: [{ productId: new ObjectId(productId), quantity: 1 }]
                });
            }
        
            res.status(200).json({ message: "Product added to cart successfully" });
          } catch (error) {
            console.error('Error adding product to cart:', error);
            res.status(500).json({ error: "Internal Server Error" });
          }
        },
        getUserById: (userId) => {
          return new Promise((resolve, reject) => {
            db.get()
              .collection(collection.USER_COLLECTION)
              .findOne({ _id: new ObjectId(userId) })
              .then((user) => {
                if (user) {
                  resolve(user);
                } else {
                  reject("User not found");
                }
              })
              .catch((error) => {
                console.error("Error fetching user by ID:", error.message);
                reject("Failed to fetch user");
              });
          });
        },
        addOrder: (userId, productId, productName, totalPrice, paymentMethod) => {
          return new Promise(async (resolve, reject) => {
            try {
              // Ensure valid ObjectIds for userId and productId
              if (!ObjectId.isValid(userId) || !ObjectId.isValid(productId)) {
                return reject('Invalid user or product ID.');
              }
        
              const order = {
                userId: new ObjectId(userId),
                productId: new ObjectId(productId),
                productName,
                totalPrice,
                paymentMethod,
                status: 'Pending', // Initial status
                createdAt: new Date(),
              };
        
              const result = await db.get().collection(collection.ORDERS_COLLECTION).insertOne(order);
              resolve(result.insertedId); // Return the inserted order ID
            } catch (err) {
              reject('Error saving order: ' + err.message);
            }
          });
        }
        
        
        
        
        
        
        
      
        
    
  };
