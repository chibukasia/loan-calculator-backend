import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import bodyParser = require("body-parser");
import cors from 'cors'
import users from './routes/user'
import auth from './routes/auth'
import loans from './routes/loan'


dotenv.config();

const app: Express = express();
const port = 8000;
app.use(cors())
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.get("/", (req: Request, res: Response) => {
  res.send("Route restricted to /api");
});

app.use('/api/users', users)
app.use('/api/login', auth)
app.use('/api/loans', loans)

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});