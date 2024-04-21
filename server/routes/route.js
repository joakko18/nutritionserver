const express = require('express');
const router = express.Router();
const pool = require('../database/database')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')('sk_test_51Occ5qKZYkjcWggdE35CcZNAMvl9xvryd6ZjWv98zSd8XadlEVm6z1uFinBUnfjYY3a7OwXKfBNK3AICccNLIkI100jUcWp2Rf'); // Replace with your actual Stripe Secret Key

//test
router.get('/', (req, res) => {
    res.send('Hello, welcome to the server!');
  });


  //login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Query the database for the admin
      const admin = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
      console.log(email,password)
      console.log(admin)
      
  
      if (admin.rows.length === 0) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
  
      const adminData = admin.rows[0];
  
      // Compare the password with the hashed password
      const isMatch = await bcrypt.compare(password, adminData.password);
  
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
  
      // Generate a token (example using jsonwebtoken)
      const token = jwt.sign({ userId: adminData.id}, 'your-secret-key', { expiresIn: '1h' });
  
      // Send a successful response with the token
      res.json({ token });
      console.log(token)
    } catch (error) {
      console.error('Error in login:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });




// Insert a new admin
router.post('/newadmin', async (req, res) => {
  const client = await pool.connect();

  try {
    const { name, email, password } = req.body;

    // Use a transaction to ensure atomicity
    await client.query('BEGIN');

    // Check if the email already exists
    const userExists = await client.query('SELECT * FROM admins WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      await client.query('ROLLBACK'); // Rollback the transaction
      return res.status(400).json({ message: 'Email already exists.' });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new user into the database
    const newUser = await client.query(
      'INSERT INTO admins (name, email, password) VALUES ($1, $2, $3) RETURNING *',
      [name, email, hashedPassword]
    );

    await client.query('COMMIT'); // Commit the transaction

    res.status(201).json({ message: 'User (admin) created successfully', insertedRow: newUser.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK'); // Rollback the transaction in case of an error
    console.error('Error creating new admin:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release(); // Release the client back to the pool
  }
});


  module.exports = router


  

  //route to buy

  router.post('/buyProduct', async (req, res) => {
    try {
      const { description, price, quantity } = req.body;
  
      // Insert data into the products table
      const result = await pool.query(
        'INSERT INTO compras (description, price, quantity) VALUES ($1, $2, $3) RETURNING *',
        [description, price, quantity]
      );
  
      res.status(201).json({ message: 'Product inserted successfully', insertedProduct: result.rows[0] });
    } catch (error) {
      console.error('Error inserting product:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });


  //route to create products
  
router.post('/createProduct', async (req, res) => {
  try {
    const { description, price, image_url } = req.body;

    // Insert data into the products table
    const result = await pool.query(
      'INSERT INTO productstype (description, price, image_url) VALUES ($1, $2, $3) RETURNING *',
      [description, price, image_url]
    );

    res.status(201).json({ message: 'Product inserted successfully', insertedProduct: result.rows[0] });
  } catch (error) {
    console.error('Error inserting product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});




// Route to get product types
router.get('/getProductTypes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productstype');
    const productTypes = result.rows;

    res.json({ productTypes });
  } catch (error) {
    console.error('Error fetching product types:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Edit productstypes by ID
router.put('/editProduct/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, price, image_url } = req.body;

    const result = await pool.query(
      'UPDATE productstype SET description = $1, price = $2, image_url = $3 WHERE id = $4 RETURNING *',
      [description, price, image_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product updated successfully', updatedRow: result.rows[0] });
  } catch (error) {
    console.error('Error editing product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// DELETE route to remove a product by id
router.delete('/deleteProduct/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the product exists
    const productExists = await pool.query('SELECT * FROM productstype WHERE id = $1', [id]);

    if (productExists.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete the product
    await pool.query('DELETE FROM productstype WHERE id = $1', [id]);

    res.json({ message: 'Product deleted successfully', deletedProductId: id });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


//route to save purchases 
// Save a purchase
router.post('/savePurchase', async (req, res) => {
  try {
    const { description, price, quantity } = req.body;

    // Insert the new purchase into the database
    const newPurchase = await pool.query(
      'INSERT INTO compras (description, price, quantity) VALUES ($1, $2, $3) RETURNING *',
      [description, price, quantity]
    );

    res.status(201).json({ message: 'Purchase saved successfully', insertedRow: newPurchase.rows[0] });
  } catch (error) {
    console.error('Error saving purchase:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



//stripe payments route

//stripe payments route
 //Route to create a Checkout session
router.post('/create-checkout-session', async (req, res) => {
  const {  cartItems } = req.body;

  const lineItems = cartItems.map(item => ({
    price_data: {
      currency: 'eur',
      product_data: {
        name: item.description,
      },
      unit_amount: item.price * 100,
    },
    quantity: item.quantity,
  }));

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel',
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating Checkout session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to handle successful payment
router.post('/checkout-success', async (req, res) => {
  const { paymentIntentId, cartItems } = req.body;

  try {
    // Retrieve payment details from Stripe using paymentIntentId
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Extract purchase details from paymentIntent metadata
    const { description, price, quantity } = paymentIntent.metadata;

    // Save the purchase details to your database
    // Example code assuming you have a database model called Purchase
    const purchase = new Purchase({
      description,
      price,
      quantity,
    });
    await purchase.save();

    // Respond with success message
    res.status(200).json({ message: 'Purchase saved successfully' });
  } catch (error) {
    console.error('Error saving purchase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});





