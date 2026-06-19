export const updateThemeColor = (isDark: boolean) => {
  const el = document.querySelector('meta[name="theme-color"]');

  el?.setAttribute("content", isDark ? "#0a0a0a" : "#ffffff");
};
