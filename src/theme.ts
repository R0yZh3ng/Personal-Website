import { createContext, useContext } from 'react';

export interface Theme {
  blueprint: boolean;
  setBlueprint: (b: boolean) => void;
}
export const ThemeContext = createContext<Theme>({ blueprint: false, setBlueprint: () => {} });
export const useTheme = () => useContext(ThemeContext);

/** colours + interaction state handed to the 3D models (context does not cross the r3f boundary, so Thumb re-provides it) */
export interface ModelState {
  INK: string;
  ACC: string;
  orbit: boolean;
  hot: boolean;
}
export const palette = (blueprint: boolean) =>
  blueprint ? { INK: '#f2f6ff', ACC: '#ffd23f' } : { INK: '#15161a', ACC: '#ff4b14' };
export const ModelCtx = createContext<ModelState>({ ...palette(false), orbit: false, hot: false });
export const useModel = () => useContext(ModelCtx);
