declare module "dotenv" {
  interface DotenvParseOptions {
    [key: string]: string;
  }
  export function config(options?: { path?: string; encoding?: string }): { parsed?: DotenvParseOptions } | undefined;
  export function parse(src: string): DotenvParseOptions;
}