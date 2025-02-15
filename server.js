// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 5001;
const cors = require('cors');


const mongoURI = process.env.MONGO_URI;


// Connect to MongoDB
mongoose.connect(mongoURI)
  .then(() => {
    console.log('Connected to MongoDB');
    return seedDatabase();
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err)
});


app.use(express.json());
 
app.use(cors({
    origin: 'http://localhost:3000',  
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }));
  
const bookSchema = new mongoose.Schema({
	title: String,
	author: String,
	genre: String,
	description: String,
	price: Number,
	image: String,
});

const cartSchema = new mongoose.Schema({
	userId: {
		type: String,
		default: 'default-user' 
	},
	items: [{
	  bookId: { 
		type: mongoose.Schema.Types.ObjectId, 
		ref: 'Book' ,
		required: true
		},
	  	title: String,
	  	author: String,
	  	price: Number,
	 	quantity: { 
		  type: Number, 
		  default: 1 
		},
	  image: String
	}],
	total: { 
		type: Number, 
		default: 0 

	}
  }, {
	timestamps: true
  });
  
  const Cart = mongoose.model('Cart', cartSchema);

const Book = mongoose.model('Book', bookSchema);

//middleware 
app.use(express.json());
app.use(cors({
	origin: 'http://localhost:3000',  
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }));


// Function to seed initial data into the database
const seedDatabase = async () => {
	try {
		await Book.deleteMany(); // Clear existing data

		const books = [
			{ title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', genre: 'Fiction', description: 'A classic novel about the American Dream', price: 20, image: 'https://media.geeksforgeeks.org/wp-content/uploads/20240110011815/sutterlin-1362879_640-(1).jpg' },
			{ title: 'To Kill a Mockingbird', author: 'Harper Lee', genre: 'Fiction', description: 'A powerful story of racial injustice and moral growth', price: 15, image: 'https://media.geeksforgeeks.org/wp-content/uploads/20240110011854/reading-925589_640.jpg' },
			{ title: '1984', author: 'George Orwell', genre: 'Dystopian', description: 'A dystopian vision of a totalitarian future society', price: 255, image: 'https://media.geeksforgeeks.org/wp-content/uploads/20240110011929/glasses-1052010_640.jpg' },
			{ title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', genre: 'Fiction', description: 'A classic novel about the American Dream', price: 220, image: 'https://media.geeksforgeeks.org/wp-content/uploads/20240110011929/glasses-1052010_640.jpg' },
			{ title: 'To Kill a Mockingbird', author: 'Harper Lee', genre: 'Fiction', description: 'A powerful story of racial injustice and moral growth', price: 1115, image: 'https://media.geeksforgeeks.org/wp-content/uploads/20240110011929/glasses-1052010_640.jpg' },
			{ title: '1984', author: 'George Orwell', genre: 'Dystopian', description: 'A dystopian vision of a totalitarian future society', price: 125, image: 'https://media.geeksforgeeks.org/wp-content/uploads/20240110011929/glasses-1052010_640.jpg' },
            
                
            
    
		];
		
		await Book.insertMany(books);
		console.log('Database seeded successfully');
	} catch (error) {
		console.error('Error seeding database:', error);
	}
};



// Define API endpoint for fetching all books
app.get('/api/books', async (req, res) => {
	try {
		// Fetch all books from the database
		const allBooks = await Book.find();

		// Send the entire books array as JSON response
		res.json(allBooks);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

// Get cart contents
app.get('/api/cart', async (req, res) => {
	try {

	  let cart = await Cart.findOne();
	  if (!cart) {
		cart =  new Cart({items: [], total:0});
		await cart.save();
	  }
	  res.json(cart);
	} catch (error) {
	  console.error('Error fetching cart:', error);
	  res.status(500).json({ error: 'Internal Server Error' });
	}
  });
  
  // Add item to cart
  app.post('/api/cart/add', async (req, res) => {
	try {
		const userId = 'default-user';
	  let cart = await Cart.findOne({userId});

	  if (!cart) {
		cart = new Cart({ items:[], total: 0});
	}

	const { _id, title, author, price, image } = req.body;

	const existingItemIndex = cart.items.findIndex(item =>
		item.bookId.toString() === _id.toString()
	);

	if (existingItemIndex > -1) {

        cart.items[existingItemIndex].quantity += 1;
    } else {

        cart.items.push({
			 bookId: _id, 
			 title, 
			 author, 
			 price, 
			 quantity: 1, 
			 image 
			});
    	}

		cart.total = cart.items.reduce((sum, item) => 
			sum + (item.price * item.quantity), 0
		);

		await cart.save();
		res.json(cart);
	}	 catch (error) {
		console.error('Error fetching cart:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
	});		
  
  // Remove item from cart
  app.delete('/api/cart/remove/:bookId', async (req, res) => {
	try {
	    let cart = await Cart.findOne();
  
	  const bookId = req.params.bookId;

	  if (!bookId) {
		return res.status(400).json({ error: 'Book ID is required' });
	  }
	 

      cart.items = cart.items.filter(item => 
		item.bookId.toString()!== bookId
	);
	  

	  cart.total = cart.items.reduce((sum, item) =>
	    sum + (item.price * item.quantity), 0
	);
	  
	  
	  await cart.save();
	  res.json(cart);
	} catch (error) {
	  console.error('Error removing from cart:', error);
	  res.status(500).json({ error: 'Internal Server Error' });
	}
  });

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
