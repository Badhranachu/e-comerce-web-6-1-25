const express = require('express'); // Import Express
const router = express.Router(); // Initialize Router

// Define your route
router.get('/', (req, res) => {
    console.log("Client route accessed");
    res.send("hei")
    
  });

  
  

module.exports = router; // Export the router to use in other files
