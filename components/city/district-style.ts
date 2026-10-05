import type { PublicProperty } from "@/types";

/**
 * Districts with personality (PDF page 3), from reusable pieces:
 * Centro dense and commercial, Financiero glass towers, Tecnológico light glass with colour
 * stripes, Ocio coloured facades and screens, Casco Antiguo low buildings with pitched roofs,
 * Ribera green roofs by the water. Paving stays calm cream everywhere.
 */
const styles = {
  downtown: {
    paving: "#f1ece1",
    trim: "#c9b48e",
    glass: "#5f7d77",
    trees: "#86a874",
    walls: ["#efe8da", "#e8dcc6", "#f3eee3"],
    roof: "#f6f2ea",
  },
  "business-district": {
    paving: "#eeebe3",
    trim: "#8fa3a8",
    glass: "#7d9aa3",
    trees: "#7fa36f",
    walls: ["#a9bec4", "#b7c9cd", "#9fb5bc"],
    roof: "#e5eaea",
  },
  "tech-district": {
    paving: "#eff0e9",
    trim: "#6f8fd9",
    glass: "#9fc2c4",
    trees: "#8fb07d",
    walls: ["#d4e3e2", "#dce9e6", "#cbdedd"],
    roof: "#f2f5f1",
  },
  "entertainment-district": {
    paving: "#f2ebe4",
    trim: "#b06aa6",
    glass: "#6f6478",
    trees: "#86a874",
    walls: ["#efd9cf", "#ead3dd", "#f1e1c9"],
    roof: "#f4ede6",
  },
  "old-town": {
    paving: "#f1e8d8",
    trim: "#b0704f",
    glass: "#6a8077",
    trees: "#8aa874",
    walls: ["#ecd8b6", "#e7cfa8", "#f0e0c4"],
    roof: "#b9654a",
  },
  riverside: {
    paving: "#eef0e7",
    trim: "#6f9a63",
    glass: "#6f9c9d",
    trees: "#7fa36f",
    walls: ["#f1f1e9", "#e6ece3", "#eeefe6"],
    roof: "#a9c68f",
  },
  "residential-district": {
    paving: "#f0ebdf",
    trim: "#a9b88c",
    glass: "#6e8780",
    trees: "#86a874",
    walls: ["#ede4d1", "#e6ddc7", "#f2ebdc"],
    roof: "#c0795c",
  },
};
export function districtStyle(id: string) {
  return styles[id as keyof typeof styles] || styles.downtown;
}
export function districtWall(p: PublicProperty) {
  // The admin's explicit building color still takes precedence over seeded colors.
  const seeded = [
    "#ece2cf",
    "#ddc5a8",
    "#c6cfc7",
    "#a9bec1",
    "#eee9dc",
    "#c3b4a1",
    "#b2c2bd",
  ];
  return seeded.includes(p.color)
    ? districtStyle(p.districtId).walls[p.number % 3]
    : p.color;
}
