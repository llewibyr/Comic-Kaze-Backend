const express = require("express");
const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Book = require("../models/Book");
const authenticateUser = require("../middleware/authMiddleware");

const router = express.Router();

// Get cart contents (GET)
router.get("/", authenticateUser, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.userId }).populate("items.bookId");

    if (!cart) {
      cart = new Cart({ userId: req.user.userId, items: [], total: 0 });
      await cart.save();
    }

    res.json(cart);
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add item to cart (POST)
router.post("/add", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [], total: 0 });
    }

    const { _id, title, author, price, image } = req.body;

    if (!_id || !mongoose.Types.ObjectId.isValid(_id)) {
      return res.status(400).json({ error: "Invalid book ID format" });
    }

    const bookExists = await Book.findById(_id);
    if (!bookExists) {
        console.log("bookExists", bookExists)
      return res.status(400).json({ error: "Invalid book ID" });
    }

    const existingItem = cart.items.find((item) => item.bookId.toString() === _id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.items.push({ bookId: _id, title, author, price, quantity: 1, image });
    }

    cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    await cart.save();

    res.json(cart);
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update cart item quantity (PUT)
router.put("/update/:bookId", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookId = req.params.bookId;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex((item) => item.bookId.toString() === bookId);
    if (itemIndex === -1) {
      return res.status(400).json({ error: "Item not found in cart" });
    }

    cart.items[itemIndex].quantity = quantity;
    cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    await cart.save();

    res.json(cart);
  } catch (error) {
    console.error("Error updating cart item:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Remove item from cart (DELETE)
router.delete("/remove/:bookId", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookId = req.params.bookId;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex((item) => item.bookId.toString() === bookId);
    if (itemIndex === -1) {
      return res.status(400).json({ error: "Item not found in cart" });
    }

    if (cart.items[itemIndex].quantity > 1) {
      cart.items[itemIndex].quantity -= 1;
    } else {
      cart.items.splice(itemIndex, 1);
    }

    cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    await cart.save();

    res.json(cart);
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
