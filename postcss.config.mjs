import tailwindcssPostcss from "@tailwindcss/postcss";

// Function form is required: Turbopack (Next 16) and Vite 8's postcss-load-config
// both reject the string plugin name ("Invalid PostCSS Plugin found at: plugins[0]").
export default {
  plugins: [tailwindcssPostcss()],
};
