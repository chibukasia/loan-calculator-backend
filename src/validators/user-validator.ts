import { z } from "zod";

export const userSchema = z.object({
    name: z.string({required_error: 'Name is required', invalid_type_error: 'Names should only contain characters'}),
    email: z.string({required_error: 'Email is required'}).email({message: 'Invalid email'}),
    password: z.string({required_error: 'Password is required'}).min(6, {message: 'Password must be at least 6 characters long'}),
})