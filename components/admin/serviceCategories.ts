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

export const SERVICE_CATEGORIES_RELOAD_EVENT = "cafs:service-categories-reload";

export function notifyServiceCategoriesReload() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SERVICE_CATEGORIES_RELOAD_EVENT));
}
