import rawMenuConfig from "../../../config/menuConfig.json";

export type MenuCategoryConfig = {
  id: string;
  label: string;
  description: string;
  isVisible: boolean;
  order: number;
};

export type MenuConfig = {
  version: number;
  updatedAt: string;
  categories: MenuCategoryConfig[];
};

export type NavCategory = {
  id: string;
  label: string;
  href: string;
  description: string;
  order: number;
  isVisible: boolean;
  /** @deprecated Use isVisible — kept for backward compatibility */
  enabled: boolean;
};

const menuConfig = rawMenuConfig as MenuConfig;

function normalizeCategory(category: MenuCategoryConfig): NavCategory {
  return {
    id: category.id,
    label: category.label,
    description: category.description,
    href: `/category/${category.id}`,
    order: category.order,
    isVisible: category.isVisible,
    enabled: category.isVisible,
  };
}

export function getMenuConfig(): MenuConfig {
  return menuConfig;
}

export function getAllCategories(): NavCategory[] {
  return [...menuConfig.categories]
    .sort((a, b) => a.order - b.order)
    .map(normalizeCategory);
}

/** Categories shown in GNB and public discovery surfaces */
export function getVisibleCategories(): NavCategory[] {
  return getAllCategories().filter((category) => category.isVisible);
}

export function getCategoryById(id: string): NavCategory | undefined {
  return getAllCategories().find((category) => category.id === id);
}

export function isCategoryVisible(id: string): boolean {
  return getCategoryById(id)?.isVisible ?? false;
}

/** @deprecated Use getAllCategories() */
export const NAV_CATEGORIES = getAllCategories();

/** @deprecated Use getVisibleCategories() */
export const ENABLED_CATEGORIES = getVisibleCategories();

/** @deprecated Use getVisibleCategories() */
export const VISIBLE_CATEGORIES = getVisibleCategories();
