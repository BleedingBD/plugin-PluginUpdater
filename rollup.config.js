import nodeResolve from "@rollup/plugin-node-resolve";
import ts from "rollup-plugin-ts";
import commonjs from "@rollup/plugin-commonjs";
import postcss from "rollup-plugin-postcss";
import terser from "@rollup/plugin-terser";
import license from "rollup-plugin-license";
import pkg from "./package.json" assert {type: "json"};

export default {
    input: "src/index.ts",
    output: {
        file: pkg.main,
        format: "cjs",
        exports: "auto"
    },
    plugins: [
        nodeResolve(),
        postcss({
            inject: false,
        }),
        ts(),
        commonjs(),
        license({
            banner: {
                commentStyle: "regular",
                content: {
                    file: "src/banner.txt",
                    encoding: "utf-8"
                }
            }
        })
    ]
};
