import express from "express";
import userController from "./users/user.controller.js"
import dotenv from "dotenv"



const app = express();
const PORT = process.env.PORT || 4000;
dotenv.config
app.use(express.json());
app.get("/", (req, res) => {
  res.send("Hello World");
});
app.use("/user", userController);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
