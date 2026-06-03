import dotenv from 'dotenv';
import app from "./app";

dotenv.config();

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';

app.listen(port, host, () => {
  console.log(`Backend listening on ${host}:${port}`);
});
