import type { PublicProperty } from "@/types";

const styles = {
  downtown: {
    paving: "#ded8c7",
    trim: "#b59568",
    glass: "#6c8985",
    trees: "#789b65",
    walls: ["#e3dccb", "#d2c3a7", "#dce0d3"],
    roof: "#e9e4d6",
  },
  "business-district": {
    paving: "#cbd3d3",
    trim: "#7f9ca8",
    glass: "#527d91",
    trees: "#658b73",
    walls: ["#bdcdd2", "#a5bdc5", "#d3dfe0"],
    roof: "#d7e0e2",
  },
  "tech-district": {
    paving: "#d4e0d9",
    trim: "#55a699",
    glass: "#4c9296",
    trees: "#88aa72",
    walls: ["#e4e9e0", "#c1d8d2", "#d3e3de"],
    roof: "#eaf0e5",
  },
  "entertainment-district": {
    paving: "#cfcbd2",
    trim: "#9a789e",
    glass: "#827589",
    trees: "#779278",
    walls: ["#b6adb9", "#bdc0bd", "#b1bac0"],
    roof: "#d9d4da",
  },
  "old-town": {
    paving: "#ddcbb5",
    trim: "#b78968",
    glass: "#68837a",
    trees: "#859866",
    walls: ["#e3ccae", "#dbc0a3", "#edddc4"],
    roof: "#b78061",
  },
  riverside: {
    paving: "#e3dbc5",
    trim: "#7faaa7",
    glass: "#659b9f",
    trees: "#7aa87b",
    walls: ["#e8e8dc", "#bcd6d0", "#d1e4df"],
    roof: "#e3ebdf",
  },
  "residential-district": {
    paving: "#d8decb",
    trim: "#8ca173",
    glass: "#779188",
    trees: "#78a160",
    walls: ["#ddd4bf", "#cad9bf", "#e8dfcb"],
    roof: "#aa8b73",
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
