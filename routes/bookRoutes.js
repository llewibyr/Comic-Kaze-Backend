const express = require("express");
const mongoose = require("mongoose");
const Book = require("../models/Book");
const authenticateUser = require("../middleware/authMiddleware"); // Protect sensitive routes

const router = express.Router();

// Fetch all books (GET)
router.get("/", async (req, res) => {
  try {
    const allBooks = await Book.find();
    res.json(allBooks);
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Fetch a single book by ID (GET)
router.get("/:id", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json(book);
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add a new book (POST) - Requires authentication
router.post("/", authenticateUser, async (req, res) => {
  try {
    const { title, author, genre, description, price, image } = req.body;

    if (!title || !author || !genre || !description || !price || !image) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newBook = new Book({ title, author, genre, description, price, image });
    await newBook.save();

    res.status(201).json({ message: "Book added successfully", book: newBook });
  } catch (error) {
    console.error("Error adding book:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update a book by ID (PUT) - Requires authentication
router.put("/:id", authenticateUser, async (req, res) => {
  try {
    const { title, author, genre, description, price, image } = req.body;

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      { title, author, genre, description, price, image },
      { new: true, runValidators: true }
    );

    if (!updatedBook) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json({ message: "Book updated successfully", book: updatedBook });
  } catch (error) {
    console.error("Error updating book:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete a book by ID (DELETE) - Requires authentication
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const deletedBook = await Book.findByIdAndDelete(req.params.id);

    if (!deletedBook) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error("Error deleting book:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
