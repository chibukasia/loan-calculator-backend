import {
  InterestRateType,
  PrismaClient,
  RepaymentFrequency,
} from "@prisma/client";
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library";
import { Request, Response } from "express";
import { loanSchema } from "../validators/loan-validator";

const prisma = new PrismaClient();

export const calculateLoan = async (req: Request, res: Response) => {
  try {
    const { error } = loanSchema.safeParse(req.body);
    if (error) {
      res.json(error.issues.map((issue) => issue.message));
      return;
    }
    const { amount, years, months, interest_rate, compound, pay_back } =
      req.body;
    const userId = req.user.id;

    if (
      !amount ||
      !years ||
      !months ||
      !interest_rate ||
      !compound ||
      !pay_back
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const loan = await handleLoanCalculation({
      userId,
      amount,
      years: parseInt(years, 10),
      months: parseInt(months, 10),
      interest_rate: parseFloat(interest_rate),
      compound,
      pay_back,
    });

    res.json({ message: "Loan calculation successful", loan });
  } catch (error) {
    loanErrorHandler(error, res);
  }
};

function calculatePayment(
  principal: number,
  interestRate: number,
  termMonths: number,
  interestRateType: InterestRateType,
  repaymentFrequency: RepaymentFrequency
): number {
  let rate = interestRate / 100;

  if (interestRateType === "ANNUAL") {
    rate = rate / 12;
  }

  const n = repaymentFrequency === "ANNUAL" ? termMonths / 12 : termMonths;
  const adjustedRate = repaymentFrequency === "ANNUAL" ? rate * 12 : rate;

  return (principal * adjustedRate) / (1 - Math.pow(1 + adjustedRate, -n));
}

function generateAmortizationSchedule(
  principal: number,
  interestRate: number,
  termMonths: number,
  startDate: Date,
  interestRateType: InterestRateType,
  repaymentFrequency: RepaymentFrequency
) {
  let rate = interestRate / 100;

  if (interestRateType === "ANNUAL") {
    rate = rate / 12;
  }

  const isAnnualRepayment = repaymentFrequency === "ANNUAL";
  const paymentInterval = isAnnualRepayment ? 12 : 1;
  const termPeriods = isAnnualRepayment ? termMonths / 12 : termMonths;

  const payment = calculatePayment(
    principal,
    interestRate,
    termMonths,
    interestRateType,
    repaymentFrequency
  );
  const schedule = [];
  let remainingBalance = principal;
  let totalToBePaid = 0;

  for (let i = 0; i < termPeriods; i++) {
    const interestPaid =
      remainingBalance * (isAnnualRepayment ? rate * 12 : rate);
    const principalPaid = payment - interestPaid;
    remainingBalance -= principalPaid;
    totalToBePaid += payment;

    schedule.push({
      paymentDate: new Date(
        startDate.setMonth(startDate.getMonth() + paymentInterval)
      ),
      principalPaid: parseFloat(principalPaid.toFixed(2)),
      interestPaid: parseFloat(interestPaid.toFixed(2)),
      balance: Math.max(0, parseFloat(remainingBalance.toFixed(2))),
    });
  }

  return { schedule, totalToBePaid: parseFloat(totalToBePaid.toFixed(2)) };
}

async function handleLoanCalculation({
  userId,
  amount,
  years,
  months,
  interest_rate,
  compound,
  pay_back,
}: {
  userId: string;
  amount: number;
  years: number;
  months: number;
  interest_rate: number;
  compound: "monthly" | "annually";
  pay_back: "monthly" | "yearly";
}) {
  const termMonths = years * 12 + months;
  const interestRateType: InterestRateType =
    compound === "monthly" ? "MONTHLY" : "ANNUAL";
  const repaymentFrequency: RepaymentFrequency =
    pay_back === "monthly" ? "MONTHLY" : "ANNUAL";

  const payment = calculatePayment(
    amount,
    interest_rate,
    termMonths,
    interestRateType,
    repaymentFrequency
  );

  const loan = await prisma.loan.create({
    data: {
      userId,
      principalAmount: amount,
      interestRate: interest_rate,
      interestRateType,
      termMonths,
      repaymentFrequency,
      monthlyPayment: parseFloat(payment.toFixed(2)),
    },
  });

  const startDate = new Date();
  const { schedule, totalToBePaid } = generateAmortizationSchedule(
    amount,
    interest_rate,
    termMonths,
    startDate,
    interestRateType,
    repaymentFrequency
  );

  for (const payment of schedule) {
    await prisma.amortizationSchedule.create({
      data: {
        loanId: loan.id,
        paymentDate: payment.paymentDate,
        principalPaid: payment.principalPaid,
        interestPaid: payment.interestPaid,
        balance: payment.balance,
      },
    });
  }

  const updatedLoan = await getLoanDetailsHandler(loan.id);
  return { ...updatedLoan, totalToBePaid };
}

async function getLoanDetailsHandler(id: string) {
  try {
    const loan = await prisma.loan.findUnique({
      where: {
        id,
      },
      include: {
        amortizationSchedules: true,
      },
    });
    return loan;
  } catch (error: any) {
    console.log(error);
  }
}

const loanErrorHandler = (error: any, res: Response) => {
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === "P2001") {
      res.status(404).json({ error: "Loan not found" });
    }
    if (error.code === "P2011") {
      res.json({ error: `${error.message}` });
    }
  } else if (error instanceof PrismaClientValidationError) {
    console.log(error);
    const searchText = "Invalid value for argument";
    const lastIndex = error.message.lastIndexOf(searchText);
    const errorMessage = error.message.substring(lastIndex);
    res.status(500).json({ error: errorMessage });
  } else {
    console.log(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};
