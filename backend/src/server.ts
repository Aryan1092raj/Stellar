import dotenv from 'dotenv';
import app from "./app";

dotenv.config();

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '127.0.0.1';

app.listen(port, host, () => {
  console.log(`Backend listening on ${host}:${port}`);
});
