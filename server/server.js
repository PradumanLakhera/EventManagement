const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./db");
const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");

const app = express();

const PORT = process.env.PORT || 5000;

connectDB();

const allowedOrigins = [
  "http://localhost:5173",
  "https://eventmanagement-brown-beta.vercel.app",
  "https://pradumanlakhera.github.io"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    }
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Meetafriend API is running"
  });
});

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});