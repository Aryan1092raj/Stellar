import dotenv from 'dotenv';
import app from "./app.js";
import "./uploads/ipfs.js";

dotenv.config();

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Backend listening on ${port}`);
});
