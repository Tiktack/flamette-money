import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { ensureUserBootstrap } from "@/lib/bootstrap.server"
import { normalizeCurrencyOrDefault } from "@/lib/currency"
import { db } from "@/lib/db/client.server"
import { categories } from "@/lib/db/schema"
import { getOpenRouterApiKey, getOpenRouterModel } from "@/lib/env.server"

import type { ReceiptItemResponse, ScanReceiptResponse } from "@/lib/api/generated/types.gen"
type CategoryRow = typeof categories.$inferSelect

type AiReceiptItem = {
  name?: string | null
  quantity?: number | string | null
  unit?: string | null
  unitPrice?: number | string | null
  promotionAmount?: number | string | null
  finalAmount?: number | string | null
  category?: string | null
  subcategory?: string | null
}

type AiReceiptResult = {
  merchant?: string | null
  date?: string | null
  amount?: number | string | null
  currency?: string | null
  items?: AiReceiptItem[] | null
}

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "HttpError"
    this.status = status
  }
}

function fail(message: string, status = 400): never {
  throw new HttpError(status, message)
}

async function requireUserIdForRequest(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    fail("Unauthorized", 401)
  }

  await ensureUserBootstrap(session.user.id)
  return session.user.id
}

function buildCategoryPromptList(values: CategoryRow[]) {
  const parentCategories = values.filter((category) => category.parentId === null)
  const childrenByParent = new Map<string, CategoryRow[]>()

  for (const category of values) {
    if (!category.parentId) continue
    const existing = childrenByParent.get(category.parentId) ?? []
    existing.push(category)
    childrenByParent.set(category.parentId, existing)
  }

  return parentCategories
    .map((category) => {
      const children = childrenByParent.get(category.id) ?? []
      if (children.length === 0) {
        return `  - "${category.name}" (${category.type}) -- no subcategories`
      }

      const childNames = children.map((child) => `"${child.name}"`).join(", ")
      return `  - "${category.name}" (${category.type}) -- valid subcategories: ${childNames}`
    })
    .join("\n")
}

function buildPrompt(categoryList: string) {
  return `You are a receipt parsing assistant. Analyze the attached receipt image carefully.

Extract the following information and return it as JSON:
1. merchant - The store/merchant name
2. date - The transaction date (ISO 8601 format: YYYY-MM-DD)
3. amount - The total amount paid
4. currency - The currency code (e.g., USD, EUR, GBP, PLN)
5. items - Array of line items found on the receipt

For each item, extract:
- name: Item description
- quantity: Number of units (default 1 if not specified)
- unit: Unit of measurement (e.g., "pcs", "kg", "lb") or null
- unitPrice: Price per unit
- promotionAmount: Any discount applied to this item (0 if none)
- finalAmount: The final price after discount (unitPrice * quantity - promotionAmount)
- category: The EXACT parent category name from the list below (MUST match exactly, character by character)
- subcategory: The EXACT subcategory name from the list below, or null if none matches (MUST match exactly, character by character)

AVAILABLE CATEGORIES AND SUBCATEGORIES (use ONLY these exact strings):
${categoryList}

STRICT RULES FOR CATEGORY ASSIGNMENT:
- You MUST ONLY use category and subcategory names that appear EXACTLY in the list above.
- DO NOT invent, create, or modify category names. Copy them character-for-character.
- If an item does not clearly fit any category, set category to the closest parent category and subcategory to null.
- The "category" field must be a parent category name.
- The "subcategory" field must be one of the listed subcategory names for that parent, or null.
- If a subcategory matches but belongs to a different parent, use the correct parent for that subcategory.
- Tax, charges, bags, and service fees: assign to the most relevant parent category, subcategory null.

Return ONLY valid JSON in this exact structure (no markdown, no commentary):
{
  "merchant": "Store Name",
  "date": "2026-02-11",
  "amount": 25.5,
  "currency": "USD",
  "items": [
    {
      "name": "Item Name",
      "quantity": 1,
      "unit": "pcs",
      "unitPrice": 3.99,
      "promotionAmount": 0,
      "finalAmount": 3.99,
      "category": "Groceries",
      "subcategory": "Fruits & Vegetables"
    }
  ]
}`
}

function extractJsonText(raw: string) {
  let value = raw.trim()

  if (value.startsWith("```")) {
    const firstNewline = value.indexOf("\n")
    if (firstNewline >= 0) {
      value = value.slice(firstNewline + 1)
    }
    if (value.endsWith("```")) {
      value = value.slice(0, -3)
    }
    value = value.trim()
  }

  return value
}

function toNumber(value: number | string | null | undefined, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeItemResponse(
  item: AiReceiptItem,
  categoryLookup: Map<string, { id: string; parentId: string | null }>,
): ReceiptItemResponse {
  let categoryId: string | null = null
  let subCategoryId: string | null = null

  if (item.subcategory && categoryLookup.has(item.subcategory.toLowerCase())) {
    const match = categoryLookup.get(item.subcategory.toLowerCase())
    if (match) {
      categoryId = match.parentId ?? match.id
      subCategoryId = match.parentId ? match.id : null
    }
  } else if (item.category && categoryLookup.has(item.category.toLowerCase())) {
    const match = categoryLookup.get(item.category.toLowerCase())
    if (match) {
      categoryId = match.parentId ?? match.id
      subCategoryId = match.parentId ? match.id : null
    }
  }

  const quantity = toNumber(item.quantity, 1)
  const unitPrice = toNumber(item.unitPrice, 0)
  const promotionAmount = toNumber(item.promotionAmount, 0)
  const derivedFinalAmount = unitPrice * quantity - promotionAmount

  return {
    name: item.name?.trim() || "Unknown item",
    quantity: quantity > 0 ? quantity : 1,
    unit: item.unit?.trim() || null,
    unitPrice,
    promotionAmount,
    finalAmount: toNumber(item.finalAmount, derivedFinalAmount),
    categoryName: item.category?.trim() || null,
    categoryId,
    subCategoryId,
  }
}

async function completeReceiptPrompt(file: File, prompt: string) {
  const apiKey = getOpenRouterApiKey()
  if (!apiKey) {
    fail("Receipt scanning is not configured. Set OPENROUTER_API_KEY to enable it.", 400)
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const dataUrl = `data:${file.type};base64,${bytes.toString("base64")}`

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOpenRouterModel(),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  })

  const bodyText = await response.text()
  if (!response.ok) {
    fail(`AI processing failed: ${bodyText || response.statusText}`)
  }

  const parsed = JSON.parse(bodyText) as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>
      }
    }>
  }

  const content = parsed.choices?.[0]?.message?.content
  const rawContent = typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((part) => part.text ?? "").join("\n")
      : ""

  if (!rawContent.trim()) {
    fail("AI processing failed: empty response received.")
  }

  return JSON.parse(extractJsonText(rawContent)) as AiReceiptResult
}

export async function handleReceiptScanRequest(request: Request) {
  const userId = await requireUserIdForRequest(request)
  const formData = await request.formData()
  const file = formData.get("file")
  const accountId = String(formData.get("accountId") ?? "").trim()

  if (!(file instanceof File) || file.size === 0) {
    fail("No image file was uploaded.")
  }

  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"])
  if (!allowedTypes.has(file.type.toLowerCase())) {
    fail("Only JPEG, PNG, WebP, and HEIC images are supported.")
  }

  if (!accountId) {
    fail("Account not found.")
  }

  const [account, categoryRows] = await Promise.all([
    db.query.accounts.findFirst({
      where: (table, { and }) => and(eq(table.id, accountId), eq(table.userId, userId)),
    }),
    db.query.categories.findMany({ where: eq(categories.userId, userId) }),
  ])

  if (!account) {
    fail("Account not found.")
  }

  const categoryLookup = new Map<string, { id: string; parentId: string | null }>()
  for (const category of categoryRows) {
    categoryLookup.set(category.name.toLowerCase(), {
      id: category.id,
      parentId: category.parentId,
    })
  }

  const aiResult = await completeReceiptPrompt(file, buildPrompt(buildCategoryPromptList(categoryRows)))
  const items = (aiResult.items ?? []).map((item) => normalizeItemResponse(item, categoryLookup))
  const parsedDate = aiResult.date ? new Date(aiResult.date) : null
  const totalAmount = toNumber(aiResult.amount, items.reduce((sum, item) => sum + toNumber(item.finalAmount), 0))

  const response: ScanReceiptResponse = {
    merchant: aiResult.merchant?.trim() || null,
    date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : new Date().toISOString(),
    amount: totalAmount,
    currency: normalizeCurrencyOrDefault(aiResult.currency ?? null, account.currency),
    items,
  }

  return Response.json(response)
}

export function toReceiptScanErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return new Response(error.message, { status: error.status })
  }

  return new Response("Failed to scan receipt.", { status: 500 })
}
