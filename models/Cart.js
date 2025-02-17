const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
        title: { type: String, required: true, trim: true },
        author: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 }, // Prevents negative prices
        quantity: { type: Number, default: 1, min: 1 }, // Ensures quantity is at least 1
        image: { type: String, required: true, trim: true },
      },
    ],
  },
  { timestamps: true }
);

// Virtual field to dynamically calculate total price
cartSchema.virtual("total").get(function () {
  return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
});

module.exports = mongoose.model("Cart", cartSchema);
