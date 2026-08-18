import app from './app.js';
import { connectDatabase } from './config/database.js';
import { environment } from './config/env.js';

async function startServer() {
  await connectDatabase();

  app.listen(environment.port, () => {
    console.log(`Server running on http://localhost:${environment.port}`);
  });
}

void startServer();
