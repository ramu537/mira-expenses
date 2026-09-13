import {
  BookOpen,
  CarFront,
  HeartPulse,
  ReceiptText,
  Shapes,
  ShoppingBag,
  Sparkles,
  Utensils,
} from "lucide-react";
import { categories } from "../lib/spending";

const icons = {
  BookOpen,
  CarFront,
  HeartPulse,
  ReceiptText,
  Shapes,
  ShoppingBag,
  Sparkles,
  Utensils,
};

export default function CategoryIcon({ category, size = "regular" }) {
  const item = categories[category] || categories.OTHER;
  const Icon = icons[item.icon] || Shapes;

  return (
    <span
      className={`category-icon category-icon--${size}`}
      style={{ "--category-color": item.color }}
      aria-hidden="true"
    >
      <Icon size={size === "small" ? 16 : 19} strokeWidth={1.9} />
    </span>
  );
}

