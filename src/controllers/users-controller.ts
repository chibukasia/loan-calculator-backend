import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import bycrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { userSchema } from "../validators/user-validator";
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

const maxAge = 1 * 24 * 60 * 60;
const createToken = (id: string) => {
  return jwt.sign({ id }, "hash", { expiresIn: maxAge });
};
export const createUser = async (req: Request, res: Response) => {
  const { error } = userSchema.safeParse(req.body);
  if (error) {
    res.json(error.issues.map((issue) => issue.message));
    return;
  }
  try {
    const salt = await bycrypt.genSalt();
    const password = await bycrypt.hash(req.body.password, salt);
    const user = { ...req.body, password };
    const newUser = await prisma.user.create({
      data: user,
      omit: { password: true },
    });
    const token = createToken(newUser.id);
    res.status(201).json({ ...newUser, token });
  } catch (error: any) {
    // res.json(error?.issues.map((issue: ZodIssue) => issue.message));
    userErrorHandler(error, res);
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const loggedInUser = await prisma.user.findUnique({
      where: {
        email: req.body.email,
      },
    });

    if (loggedInUser) {
      const password = await bycrypt.compare(
        req.body.password,
        loggedInUser.password
      );
      if (password) {
        const token = createToken(loggedInUser.id);
        res.status(201).json({ ...loggedInUser, token });
      } else {
        res.status(401).json({ error: "Invalid password" });
      }
    } else {
      res.status(404).json({ error: "Email does not exist" });
    }
  } catch (error) {
    userErrorHandler(error, res);
  }
};

export const loggedinUser = async (req: Request, res: Response) => {
  const user = await findUser(req, res);
  res.status(200).json(user);
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await findUser(req, res);
    if (user) {
      res.status(200).json(user);
    }
  } catch (error) {
    userErrorHandler(error, res);
  }
};

const findUser = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: {
      id: req.params.id,
    },
    omit: { password: true },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return null;
  }
  return user;
};

const userErrorHandler = (error: any, res: Response) => {
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.json({ error: "Email already taken" });
    }
    if (error.code === "P2001") {
      res.status(404).json({ error: "User not found" });
    }
    if (error.code === "P2011") {
      res.json({ error: `${error.message}` });
    }
  } else if (error instanceof PrismaClientValidationError) {
    console.log(error);
    const searchText = "Invalid value for argument";
    const lastIndex = error.message.lastIndexOf(searchText);
    const errorMessage = error.message.substring(lastIndex);
    // const regex = /Invalid value for argument `role`.*?(?=Expected)/;

    // const match = errorMessage.match(regex);
    // if (match) {
    //   const extractedErrorMessage = match[0].trim();
    //   console.log(extractedErrorMessage);
    // } else {
    //   console.log("No match found");
    // }
    res.status(500).json({ error: errorMessage });
  } else {
    console.log(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};
