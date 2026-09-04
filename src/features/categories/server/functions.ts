import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import { categoryCreateSchema, categoryUpdateSchema } from "@/features/shared/server/validators"

import { createCategoryData, deleteCategoryData, listCategoriesData, updateCategoryData } from "./service.server"

export const getCategories = createServerFn({ method: "GET" }).handler(() => listCategoriesData())

export const createCategory = createServerFn({ method: "POST" })
  .validator((data: unknown) => categoryCreateSchema.parse(data))
  .handler(({ data }) => createCategoryData(data))

export const updateCategory = createServerFn({ method: "POST" })
  .validator((data: unknown) => categoryUpdateSchema.parse(data))
  .handler(({ data }) => updateCategoryData(data.id, data.request))

export const deleteCategory = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(({ data }) => deleteCategoryData(data.id))
