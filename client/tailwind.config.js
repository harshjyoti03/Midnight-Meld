/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#0A1F2C",
        teal: "#1EC6E8",
        cyan: "#33B5D6"
      }
    }
  },
  plugins: []
}