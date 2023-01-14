import { ITypeDescriptor } from '../ITypeDescriptor';
export declare type Color = number;
export declare const color: ITypeDescriptor<Color>;
export declare const isTransparent: (color: Color) => boolean;
export declare const asString: (color: Color) => string;
export declare const pack: (r: number, g: number, b: number, a: number) => Color;
export declare const COLORS: {
    [key: string]: Color;
};
