import React from 'react';
import { MenuData } from '@/models/MenuItem';
import MenuCategory from '@/components/MenuCategory';

interface Props {
  menu: MenuData;
}

const CATEGORY_ICONS: Record<string, string> = {
  burger: '🍔',
  combo: '⭐',
  fries: '🍟',
  drink: '🥤',
  dessert: '🍦',
};

export default function MenuBoard({ menu }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-2">
      {menu.categories.map((category) => (
        <MenuCategory
          key={category.name}
          name={category.name}
          icon={CATEGORY_ICONS[category.icon] || '🍽️'}
          items={category.items}
        />
      ))}
    </div>
  );
}
