import { Router } from "express";
import { createUser, getUser, loggedinUser, loginUser } from "../controllers/users-controller";
import verifyToken from "../middlewares/auth-middleware";

const router = Router();

router.post("/register", createUser)
router.post("/login", loginUser)
router.get('/me', verifyToken, loggedinUser)
router.get('/:id', verifyToken, getUser)

export default router