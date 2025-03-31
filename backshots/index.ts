import express from 'express';
import bodyParser from 'body-parser';
import routes from './routes/routes.js';
import authRoutes from './routes/authRoutes.js';
import { mongoConnect } from './util/database.js';
import * as dotenv from 'dotenv';
import { Request, Response, NextFunction } from 'express';

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

// Middleware to parse JSON bodies
// app.use(express.json());
// Or if you're using body-parser:
// app.use(bodyParser.json());

// Parse JSON first
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true }));

// Then log the request (after body is parsed)
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  next();
};
app.use(requestLogger);

app.use('/', routes);
// app.use('/auth', authRoutes); // All auth routes will be prefixed with /auth

mongoConnect(() => {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
});
