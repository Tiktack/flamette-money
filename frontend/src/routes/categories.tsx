import { createFileRoute } from '@tanstack/react-router'
import {
  Accordion,
  Badge,
  Card,
  Group,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { useCategories } from '../lib/api/hooks'
import type { CategoryHierarchy } from '../lib/api/types'
import classes from './page.module.css'

export const Route = createFileRoute('/categories')({
  component: CategoriesPage,
})

function CategoriesPage() {
  const categoriesQuery = useCategories()

  return (
    <Stack className={classes.page}>
      <Group className={classes.header}>
        <Title order={2}>Categories</Title>
        <Text size="sm" c="dimmed">
          Manage income and expense buckets
        </Text>
      </Group>

      <Card shadow="sm" radius="md" padding="lg">
        {categoriesQuery.isLoading ? (
          <Skeleton height={200} />
        ) : (
          <Accordion variant="separated">
            {(categoriesQuery.data ?? []).map((category) => (
              <CategoryItem key={category.id} category={category} />
            ))}
          </Accordion>
        )}
      </Card>
    </Stack>
  )
}

function CategoryItem({ category }: { category: CategoryHierarchy }) {
  return (
    <Accordion.Item value={category.id}>
      <Accordion.Control>
        <Group gap="sm">
          <Text>{category.name}</Text>
          <Badge variant="light" size="sm">
            {category.type}
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        {category.subcategories.length === 0 ? (
          <Text size="sm" c="dimmed">
            No subcategories
          </Text>
        ) : (
          <Stack gap="xs">
            {category.subcategories.map((subcategory) => (
              <Group key={subcategory.id} gap="sm">
                <Text>{subcategory.name}</Text>
                <Badge variant="outline" size="sm">
                  {subcategory.type}
                </Badge>
              </Group>
            ))}
          </Stack>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  )
}
