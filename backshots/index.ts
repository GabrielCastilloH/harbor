import express from "express";
import bodyParser from "body-parser";
import routes from "./routes/routes.js";
import authRoutes from "./routes/authRoutes.js";
import { mongoConnect } from "./util/database.js";
import * as dotenv from "dotenv";
import { Request, Response, NextFunction } from "express";

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
    res.status(500).send("Something broke!");
  }
);

// Middleware to parse JSON bodies
// app.use(express.json());
// Or if you're using body-parser:
// app.use(bodyParser.json());

// Parse JSON first
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/", routes);
app.use("/auth", authRoutes); // All auth routes will be prefixed with /auth

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

mongoConnect(() => {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
});
