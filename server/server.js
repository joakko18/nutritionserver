const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;
const bodyParser = require('body-parser');
const cors = require('cors');

// Apply CORS middleware globally
app.use(cors({
    origin: 'https://nutritionstore.netlify.app/',  // Replace with your frontend's origin
    methods: 'GET,POST,OPTIONS,PUT,DELETE',
    credentials: true,
}));

// Add middleware for handling JSON data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import routes
const endpoints = require('./routes/route');

// Mount routes
app.use('/', endpoints);  // This line handles all routes defined in `./routes/route.js`

// Remove the redundant CORS configuration for the login route
// app.post('/login', cors({ origin: 'https://nutritionstore.netlify.app/' }), endpoints);

app.listen(PORT, () => {
  console.log(`Server listening on port http://localhost:${PORT}`);
});
