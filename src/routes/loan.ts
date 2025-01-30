import { Router } from "express";
import verifyToken from "../middlewares/auth-middleware";
import { calculateLoan } from "../controllers/loans-controller";

const router = Router()

router.post('/calculate-loan', verifyToken, calculateLoan)

export default router