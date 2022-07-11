Vite 2.x plugin to load SVG files

## Install

```
yarn add vite-plugin-svg-loader -D
```

## Use

```
import svgLoader from 'vite-plugin-svg-loader';


// vite.config

{
  // ...
  plugins: [svgLoader()]
}
```

```
import xxx from './xxx.svg'

console.log(xxx)
// {
//   "tag": "svg",
//   "attrs": { "viewBox": "0 0 1024 1024", "focusable": "false" },
//   "children": [
//     {
//       "tag": "path",
//       "attrs": {
//         "d": "..."
//       }
//     }
//   ]
// }
```
