const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authenticateUser = require("../middleware/authMiddleware");

const router = express.Router();

// Debug: Check if User model is recognized
console.log("✅ Loaded User model:", User);

// User Registration (POST)
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required" });
    }

    console.log("🔍 Checking existing user:", username, email);
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });


    if (existingUser) {
        console.log("✅ Query executed successfully");
      return res.status(400).json({ error: "Username already exists" });
    }

    const newUser = new User({ username, email, password });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
})
;

// User Login (POST)
router.post("/login", async (req, res) => {
  try {
    console.log("🔍 Received Login Request:", req.body); // ✅ Log the request body
    
    const { identifier, password } = req.body; // ✅ Accept either username or email

    if (!identifier || !password) {
      console.error("❌ Missing identifier or password in request:", req.body);
      return res.status(400).json({ error: "Invalid username or password" });
    }

    console.log("🔍 Searching for user:", identifier);

    const user = await User.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${identifier}$`, "i") } },
        { email: { $regex: new RegExp(`^${identifier}$`, "i") } }],
    });

    if (!user) {
      console.warn("❌ No user found with identifier:", identifier);
      return res.status(400).json({ error: "Invalid email or password" });
    }

    console.log("🔍 Stored Hashed Password:", user.password); // ✅ Log the stored hashed password
    console.log("🔍 Entered Password:", password); // ✅ Log the entered password

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("✅ Password Match:", isMatch); // ✅ Log if passwords match


    if (!isMatch) {
      console.warn("❌ Password does not match for:", identifier);
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res
      .cookie("token", token, {
        httpOnly: true, // This prevents JavaScript access (XSS protection)
        secure: process.env.NODE_ENV === "production", // Use HTTPS in production
        sameSite: "Strict",
      })
      .json({ message: "Login successful", token });
      
    console.log("✅ Login successful for:", identifier); 
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get User Profile (GET)
router.get("/users/:id", authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password"); // Exclude password
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update User Information (PUT)
router.put("/users/:id", authenticateUser, async (req, res) => {
  try {
    if (req.user.userId !== req.params.id) {
      return res.status(403).json({ error: "Unauthorized to update this user" });
    }

    const { username, password } = req.body;
    let updateData = {};

    if (username) updateData.username = username;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select("-password");

    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete User (DELETE)
router.delete("/users/:id", authenticateUser, async (req, res) => {
  try {
    if (req.user.userId !== req.params.id) {
      return res.status(403).json({ error: "Unauthorized to delete this user" });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) return res.status(404).json({ error: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// User Logout (POST)
router.post("/logout", (req, res) => {
  res
    .clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    })
    .json({ message: "Logged out successfully" });
});

module.exports = router;
