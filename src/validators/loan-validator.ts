import {z} from 'zod'

export const loanSchema = z.object({
    amount: z.number({required_error: "Principal Amount required"}),
    years: z.string({required_error: "Years required"}),
    months: z.string({required_error: "Months required"}),
    compound: z.string({required_error: "Compound required"}),
    interest_rate: z.number({required_error: "Interest Rate required"}),
    pay_back: z.string({required_error: "Pay back required"})
})