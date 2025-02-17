// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 5001;
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


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
  
  const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);


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

//User Registration Route
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        res.json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//User Login Route
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ token });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token').json({ message: 'Logged out successfully' });
});

//Middleware to authenticate user
const authenticateUser = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

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
app.get('/api/cart', authenticateUser, async (req, res) => {
    try {
        let cart = await Cart.findOne({ userId: req.user.userId }).populate('items.bookId');

        if (!cart) {
            cart = new Cart({ userId: req.user.userId, items: [], total: 0 });
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
        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ items: [], total: 0 });
        }

        const { _id, title, author, price, image } = req.body;

        console.log("Received request to add book:", _id);

        if (!_id || !mongoose.Types.ObjectId.isValid(_id)) {
            console.error("Invalid book ID format:", _id);
            return res.status(400).json({ error: 'Invalid book ID format' });
        }

        const bookExists = await Book.findById(_id);
        if (!bookExists) {
            console.error("Book not found in database:", _id);
            return res.status(400).json({ error: 'Invalid book ID' });
        }

        const existingItem = cart.items.find(item => item.bookId.toString() === _id);

        if (existingItem) {
            existingItem.quantity += 1;
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

        cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        await cart.save();

        res.json(cart);
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});	
  
  // Remove item from cart
  app.delete('/api/cart/remove/:bookId', async (req, res) => {
	try {
		const userId = 'default-user';
		const bookId = req.params.bookId;

	    let cart = await Cart.findOne({ userId });


	  if (!cart) {
		return res.status(404).json({ error: 'Cart not found' });
	  }

	  const itemIndex = cart.items.findIndex(
		item => item.bookId.toString() === bookId
	  );

	  if (itemIndex === -1) {
		return res.status(400).json({error: 'Item not found in cart'});
	  }


	 if (cart.items[itemIndex].quantity > 1) {
		cart.items[itemIndex].quantity -= 1;
		} else {
			cart.items.splice(itemIndex, 1);
		}
        
        cart.items = []; // Remove all items
        cart.total = 0;

		cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
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