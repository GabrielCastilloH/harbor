// src/index.ts
import express from 'express';
import routes from './routes/routes.js';
import mongoConnect from './util/database.js';

const app = express();
const port = 3000;

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


app.use(express.json());
app.use('/', routes);

mongoConnect((client) => {
  console.log('MongoDB connection established. Starting server...');
  console.log(client)
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
});