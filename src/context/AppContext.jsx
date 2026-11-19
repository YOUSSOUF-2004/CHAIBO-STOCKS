import { createContext, useContext } from "react";
export const AppContext = createContext(null);
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp doit être utilisé dans App");
  return context;
}
