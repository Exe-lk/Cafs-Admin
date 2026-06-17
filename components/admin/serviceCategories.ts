export type ServiceCategoryNavItem = {
  id: string;
  label: string;
  count: number;
};

export function serviceCategoryHref(categoryId: string) {
  return `/admin/services?category=${encodeURIComponent(categoryId)}`;
}

export function serviceCategoryLabel(category: ServiceCategoryNavItem) {
  return `${category.label} (${category.count})`;
}
