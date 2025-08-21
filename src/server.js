import express from "express";
import notificationRoutes from "./routes/notificationRoutes.js";
import notificationReadRoutes from "./routes/notificationReadRoutes.js";

const app = express();
const PORT = process.env.PORT || 2000;

app.use(express.json());
app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/notifications", notificationRoutes);
app.use("/notification_reads", notificationReadRoutes);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
