export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
}

export interface MenuCategory {
  name: string;
  icon: string;
  items: MenuItem[];
}

export interface MenuData {
  restaurant: string;
  taxRate: number;
  categories: MenuCategory[];
}
