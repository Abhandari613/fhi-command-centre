import { z } from "zod";
import { ActionResult, createActionError } from "./types";

/**
 * @intent Wraps a server action to automatically parse Zod schemas and catch errors uniformly.
 * @generated AI-assisted
 */
export async function withActionValidation<TInput, TOutput>(
    schema: z.ZodType<TInput>,
    input: unknown,
    handler: (validatedInput: TInput) => Promise<ActionResult<TOutput>>
): Promise<ActionResult<TOutput>> {
    try {
        const validation = schema.safeParse(input);
        if (!validation.success) {
            return {
                success: false,
                error: createActionError(
                    "VALIDATION_ERROR",
                    validation.error.issues[0]?.message || "Invalid input data",
                    400,
                    validation.error.flatten()
                )
            };
        }
        return await handler(validation.data);
    } catch (e: any) {
        console.error("Server Action Exception:", e);
        return {
            success: false,
            error: createActionError(
                "INTERNAL_SERVER_ERROR",
                e?.message || "An unexpected error occurred",
                500
            )
        };
    }
}
