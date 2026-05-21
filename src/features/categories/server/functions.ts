import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import { categoryCreateSchema, categoryUpdateSchema } from "@/features/shared/server/validators"

import { createCategoryData, deleteCategoryData, listCategoriesData, updateCategoryData } from "./service.server"

export const getCategories = createServerFn({ method: "GET" }).handler(async () => listCategoriesData())

export const createCategory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => categoryCreateSchema.parse(data))
  .handler(async ({ data }) => createCategoryData(data))

export const updateCategory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => categoryUpdateSchema.parse(data))
  .handler(async ({ data }) => updateCategoryData(data.id, data.request))

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    await deleteCategoryData(data.id)
  })
