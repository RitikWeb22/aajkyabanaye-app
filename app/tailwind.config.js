/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#245C45",
          dark: "#1B4735",
          light: "#2F7558",
        },
        secondary: {
          DEFAULT: "#72A67A",
          light: "#8EB894",
        },
        accent: {
          DEFAULT: "#F4A340",
          hover: "#E09332",
        },
        background: {
          DEFAULT: "#FFF9F0",
          card: "#FFFFFF",
        },
        text: {
          DEFAULT: "#252923",
          muted: "#777D76",
        },
        border: {
          DEFAULT: "#E8E5DC",
        },
        disabled: {
          DEFAULT: "#D9DED9",
        },
        error: {
          DEFAULT: "#D94B45",
        },
      },
      fontFamily: {
        heading: ["Poppins_600SemiBold"],
        headingBold: ["Poppins_700Bold"],
        body: ["Inter_400Regular"],
        bodyMedium: ["Inter_500Medium"],
        bodySemiBold: ["Inter_600SemiBold"],
      },
    },
  },
  plugins: [],
};
