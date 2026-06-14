export const updateThemeColor = (isDark: boolean) => {
  const el = document.querySelector('meta[name="theme-color"]');

  el?.setAttribute("content", isDark ? "#1A202C" : "#3B81F6");
};
