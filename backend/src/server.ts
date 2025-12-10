import dotenv from 'dotenv';
import app from "./app";
import "./uploads/ipfs";

dotenv.config();

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Backend listening on ${port}`);
});
