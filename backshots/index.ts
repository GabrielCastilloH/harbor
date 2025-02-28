import express from 'express';
import routes from './routes/routes.js';
import authRoutes from './routes/authRoutes.js';
import { mongoConnect } from './util/database.js';
import * as dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = 3000;

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  }
);

app.use(express.json());
app.use('/', routes);
app.use('/auth', authRoutes); // All auth routes will be prefixed with /auth

mongoConnect(() => {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
});
