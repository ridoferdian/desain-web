/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["*.html"],
  theme: {
    container: {
      center: true,
      padding: "16px",
    },
    extend: {
      fontFamily: {
        Poppins: ["Poppins"],
        Chakra: ["Chakra Petch"],
        Play: ["Play"],
        Ubuntu: ["Ubuntu"],
      },
      colors: {
        primary: "#0ea5e9",
        secondary: "#78716c",
        dark: "#0f172a",
      },
    },
  },
  plugins: [],
};
