import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import bodyParser = require("body-parser");
import cors from 'cors'

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 8000;
app.use(cors())
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.get("/", (req: Request, res: Response) => {
  res.send("Route restricted to /api");
});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});